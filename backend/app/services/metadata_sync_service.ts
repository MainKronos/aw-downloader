import { getSonarrService, type SonarrSeries } from '#services/sonarr_service'
import { AnimeworldService } from '#services/animeworld_service'
import Series from '#models/series'
import Season from '#models/season'
import Episode from '#models/episode'
import { logger } from '#services/logger_service'
import { DateTime } from 'luxon'
import axios from 'axios'
import fs from 'fs/promises'
import app from '@adonisjs/core/services/app'

export class MetadataSyncService {
  private sonarrService = getSonarrService()
  private animeworldService = new AnimeworldService()

  /**
   * Sync metadata for a single series
   */
  async syncSeries(seriesId: number, refreshUrls: boolean = false): Promise<void> {
    await this.sonarrService.initialize()
    
    // Get series from database
    const series = await Series.findOrFail(seriesId)
    
    if (!series.sonarrId) {
      throw new Error(`Series ${seriesId} has no Sonarr ID`)
    }

    // Get series data from Sonarr
    const sonarrShow = await this.sonarrService.getSeriesById(series.sonarrId)
    
    logger.info('MetadataSync', `Syncing series: ${sonarrShow.title}`)
    
    await this.syncSeriesData(series, sonarrShow)
    await this.syncSeasons(series.id, sonarrShow.id, sonarrShow.seasons, refreshUrls)
    
    logger.success('MetadataSync', `Successfully synced series: ${sonarrShow.title}`)
  }

  /**
   * Sync series data (title, poster, etc.)
   */
  private async syncSeriesData(series: Series, sonarrShow: SonarrSeries): Promise<void> {
    const status = this.mapStatus(sonarrShow.status)

    // Download and save poster image
    let posterPath: string | null = series.posterPath
    let shouldDownloadPoster = true

    // Check if we should download the poster
    if (series.posterPath && series.posterDownloadedAt) {
      const hoursSinceLastDownload = DateTime.now().diff(series.posterDownloadedAt, 'hours').hours
      if (hoursSinceLastDownload < 48) {
        shouldDownloadPoster = false
        logger.debug('MetadataSync', `Skipping poster download: last downloaded ${Math.floor(hoursSinceLastDownload)} hours ago`)
      }
    }

    if (shouldDownloadPoster) {
      const posterImage = sonarrShow.images.find((img) => img.coverType === 'poster')
      if (posterImage?.remoteUrl) {
        posterPath = await this.downloadPoster(sonarrShow.id, posterImage.remoteUrl)
      }
    }

    // Format alternate titles and genres as JSON
    const alternateTitles = JSON.stringify(sonarrShow.alternateTitles)
    const genres = JSON.stringify(sonarrShow.genres)

    // Update series
    series.merge({
      title: sonarrShow.title,
      description: sonarrShow.overview || null,
      status,
      totalSeasons: sonarrShow.seasons.length,
      posterPath,
      posterDownloadedAt: shouldDownloadPoster && posterPath ? DateTime.now() : series.posterDownloadedAt,
      alternateTitles,
      genres,
      year: sonarrShow.year || null,
      network: sonarrShow.network || null,
      deleted: false,
    })
    
    await series.save()
    logger.info('MetadataSync', `Updated series data for: ${sonarrShow.title}`)
  }

  /**
   * Sync seasons for a series
   */
  private async syncSeasons(
    seriesId: number,
    sonarrSeriesId: number,
    sonarrSeasons: SonarrSeries['seasons'],
    refreshUrls: boolean = false
  ): Promise<void> {
    for (const sonarrSeason of sonarrSeasons) {
      // Skip specials (season 0)
      if (sonarrSeason.seasonNumber === 0) {
        continue
      }

      // Check if season has valid episodes before creating/updating
      const hasValidEpisodes = await this.sonarrService.seasonHasValidEpisodes(
        sonarrSeriesId,
        sonarrSeason.seasonNumber
      )

      if (!hasValidEpisodes) {
        logger.debug('MetadataSync', `Skipping season ${sonarrSeason.seasonNumber}: no valid episodes`)
        continue
      }

      let season = await Season.query()
        .where('series_id', seriesId)
        .where('season_number', sonarrSeason.seasonNumber)
        .first()

      const seasonData = {
        seriesId,
        seasonNumber: sonarrSeason.seasonNumber,
        totalEpisodes: sonarrSeason.statistics?.episodeCount || 0,
        missingEpisodes: sonarrSeason.statistics
          ? sonarrSeason.statistics.episodeCount - sonarrSeason.statistics.episodeFileCount
          : 0,
        releaseDate: sonarrSeason.statistics?.previousAiring
          ? DateTime.fromISO(sonarrSeason.statistics.previousAiring)
          : null,
      }

      if (season) {
        season.merge(seasonData)
        await season.save()
        logger.debug('MetadataSync', `Updated season ${sonarrSeason.seasonNumber}`)
      } else {
        season = await Season.create(seasonData)
        logger.debug('MetadataSync', `Created season ${sonarrSeason.seasonNumber}`)
      }

      // Try to find AnimeWorld URL if not already set
      if (!season.downloadUrls || season.downloadUrls.length === 0 || refreshUrls) {
        await this.findAnimeWorldUrls(seriesId, season.id, sonarrSeason.seasonNumber)
      }

      // Sync episodes for this season
      await this.syncEpisodes(seriesId, season.id, sonarrSeriesId, sonarrSeason.seasonNumber)
    }
  }

  /**
   * Find AnimeWorld URLs for a season
   */
  private async findAnimeWorldUrls(
    seriesId: number,
    seasonId: number,
    seasonNumber: number
  ): Promise<void> {
    try {
      const series = await Series.findOrFail(seriesId)
      const season = await Season.findOrFail(seasonId)

      logger.debug('MetadataSync', `Searching AnimeWorld for season ${seasonNumber}`)

      // Parse alternate titles
      let alternateTitles: Array<{ title: string; sceneSeasonNumber: number }> = []
      if (series.alternateTitles) {
        try {
          alternateTitles = JSON.parse(series.alternateTitles)
        } catch {
          alternateTitles = []
        }
      }

      // Build list of titles to try (main title + alternates for this season)
      const titlesToTry: Array<{ title: string; priority: number }> = [
        { title: series.title, priority: 0 },
      ]

      // Add alternate titles that match this season
      for (const altTitle of alternateTitles) {
        if (altTitle.sceneSeasonNumber === seasonNumber || altTitle.sceneSeasonNumber === -1) {
          titlesToTry.push({
            title: altTitle.title,
            priority: altTitle.sceneSeasonNumber === seasonNumber ? 1 : 2,
          })
        }
      }

      // Sort by priority (lower is better)
      titlesToTry.sort((a, b) => a.priority - b.priority)

      // Try each title
      for (const titleInfo of titlesToTry) {
        const searchKeyword = seasonNumber === 1 
          ? titleInfo.title
          : `${titleInfo.title} ${seasonNumber}`
        
        logger.debug('MetadataSync', `Searching AnimeWorld for: ${searchKeyword}`)
        
        const searchResults = await this.animeworldService.searchAnime(searchKeyword)
        
        if (searchResults.length === 0) {
          continue
        }

        const matches = this.animeworldService.findBestMatchWithParts(searchResults, searchKeyword)
        
        if (!matches || matches.length === 0) {
          continue
        }

        // Get identifiers for all parts
        const animeIdentifiers: string[] = []
        for (const match of matches) {
          const identifier = this.animeworldService.getAnimeIdentifier(match.link, match.identifier)
          animeIdentifiers.push(identifier)
        }
        
        season.downloadUrls = animeIdentifiers
        await season.save()
        
        return
      }
      
      logger.warning('MetadataSync', `Could not find AnimeWorld URL for season ${seasonNumber}`)
    } catch (error) {
      logger.error('MetadataSync', `Error searching AnimeWorld for season ${seasonNumber}`, error)
    }
  }

  /**
   * Sync episodes for a season
   */
  private async syncEpisodes(
    seriesId: number,
    seasonId: number,
    sonarrSeriesId: number,
    seasonNumber: number
  ): Promise<void> {
    try {
      const sonarrEpisodesAll = await this.sonarrService.getSeriesEpisodes(sonarrSeriesId)
      const sonarrEpisodes = sonarrEpisodesAll.filter((ep) => ep.seasonNumber === seasonNumber)

      for (const sonarrEpisode of sonarrEpisodes) {
        let episode = await Episode.query()
          .where('season_id', seasonId)
          .where('episode_number', sonarrEpisode.episodeNumber)
          .first()

        const episodeData = {
          seriesId,
          seasonId,
          sonarrId: sonarrEpisode.id,
          seasonNumber,
          episodeNumber: sonarrEpisode.episodeNumber,
          title: sonarrEpisode.title,
          overview: sonarrEpisode.overview || null,
          airDateUtc: sonarrEpisode.airDateUtc ? DateTime.fromISO(sonarrEpisode.airDateUtc) : null,
          hasFile: sonarrEpisode.hasFile,
          monitored: sonarrEpisode.monitored,
          airedStatus: (sonarrEpisode.airDateUtc && DateTime.fromISO(sonarrEpisode.airDateUtc) <= DateTime.now() ? 'aired' : 'not_aired') as 'aired' | 'not_aired',
          diskStatus: (sonarrEpisode.hasFile ? 'downloaded' : 'missing') as 'missing' | 'downloaded',
        }

        if (episode) {
          episode.merge(episodeData)
          await episode.save()
        } else {
          await Episode.create(episodeData)
        }
      }

      logger.debug('MetadataSync', `Synced ${sonarrEpisodes.length} episodes for season ${seasonNumber}`)
    } catch (error) {
      logger.error('MetadataSync', `Error syncing episodes for season ${seasonNumber}`, error)
    }
  }

  /**
   * Download poster image
   */
  private async downloadPoster(seriesId: number, posterUrl: string): Promise<string | null> {
    try {
      const response = await axios.get(posterUrl, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response.data)
      
      const posterDir = app.makePath('storage/posters')
      await fs.mkdir(posterDir, { recursive: true })
      
      const filename = `series_${seriesId}.jpg`
      const posterPath = `posters/${filename}`
      const fullPath = app.makePath('storage', posterPath)
      
      await fs.writeFile(fullPath, buffer)
      
      logger.debug('MetadataSync', `Downloaded poster for series ${seriesId}`)
      return posterPath
    } catch (error) {
      logger.error('MetadataSync', `Error downloading poster for series ${seriesId}`, error)
      return null
    }
  }

  /**
   * Map Sonarr status to our status
   */
  private mapStatus(sonarrStatus: string): 'ongoing' | 'completed' | 'cancelled' {
    switch (sonarrStatus.toLowerCase()) {
      case 'continuing':
        return 'ongoing'
      case 'ended':
        return 'completed'
      default:
        return 'cancelled'
    }
  }
}
