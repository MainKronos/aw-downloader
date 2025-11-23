export default class DownloadSuccessEvent {
  constructor(public data: {
    seriesTitle: string
    seasonNumber: number
    episodeNumber: number
    episodeTitle: string
  }) {}
}
