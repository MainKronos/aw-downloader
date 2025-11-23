export default class DownloadErrorEvent {
  constructor(public data: {
    seriesTitle: string
    seasonNumber: number
    episodeNumber: number
    episodeTitle: string
    error: string
  }) {}
}
