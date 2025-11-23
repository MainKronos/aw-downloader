import DownloadSuccessEvent from '#events/download_success_event'
import Notification from '#models/notification'
import { getNotificationService } from '#services/notification_service'
import { logger } from '#services/logger_service'

export default class SendNotificationOnDownloadSuccess {
  async handle(event: DownloadSuccessEvent) {
    try {
      // Get all enabled notifications that listen to onDownloadSuccessful event
      const notifications = await Notification.query()
        .where('enabled', true)
        .exec()

      const filteredNotifications = notifications.filter((notification) =>
        notification.events.includes('onDownloadSuccessful')
      )

      if (filteredNotifications.length === 0) {
        return
      }

      const notificationService = getNotificationService()
      const title = 'Download Completato'
      const message = `${event.data.seriesTitle} - S${event.data.seasonNumber.toString().padStart(2, '0')}E${event.data.episodeNumber.toString().padStart(2, '0')}\n${event.data.episodeTitle}`

      // Send notification to all filtered notification URLs
      for (const notification of filteredNotifications) {
        try {
          await notificationService.sendToUrl(notification.url, title, message, 'success')
          logger.info('NotificationListener', `Sent download success notification to ${notification.name}`)
        } catch (error) {
          logger.error(
            'NotificationListener',
            `Failed to send notification to ${notification.name}`,
            error
          )
        }
      }
    } catch (error) {
      logger.error('NotificationListener', 'Error handling download success event', error)
    }
  }
}
