import Notification from '#models/notification'
import { logger } from '#services/logger_service'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execPromise = promisify(exec)

export class NotificationService {
  /**
   * Send a notification using Apprise
   */
  async sendNotification(title: string, body: string, notificationType: 'info' | 'success' | 'warning' | 'failure' = 'info'): Promise<void> {
    try {
      const notifications = await Notification.query().where('enabled', true)
      
      if (notifications.length === 0) {
        logger.debug('NotificationService', 'No enabled notifications configured')
        return
      }

      for (const notification of notifications) {
        try {
          await this.sendToUrl(notification.url, title, body, notificationType)
          logger.info('NotificationService', `Notification sent to: ${notification.name}`)
        } catch (error) {
          logger.error('NotificationService', `Failed to send notification to ${notification.name}`, error)
        }
      }
    } catch (error) {
      logger.error('NotificationService', 'Error sending notifications', error)
    }
  }

  /**
   * Send notification to a specific URL using Apprise CLI
   */
  async sendToUrl(url: string, title: string, body: string, notificationType: 'info' | 'success' | 'warning' | 'failure' = 'info'): Promise<void> {
    try {
      const escapedTitle = this.escapeShellArg(title)
      const escapedBody = this.escapeShellArg(body)
      const escapedUrl = this.escapeShellArg(url)
      
      const command = `apprise -t ${escapedTitle} -b ${escapedBody} -n ${notificationType} ${escapedUrl}`
      
      const { stderr } = await execPromise(command)
      
      if (stderr) {
        throw new Error(stderr)
      }
    } catch (error) {
      logger.error('NotificationService', 'Error executing apprise command', error.message)
      throw error
    }
  }

  /**
   * Test a notification URL by sending a test message
   */
  async testNotification(url: string): Promise<boolean> {
    try {
      await this.sendToUrl(url, 'Test Notification', 'This is a test notification from AW-Downloader', 'info')
      return true
    } catch (error) {
      logger.error('NotificationService', 'Test notification failed', error.message)
      return false
    }
  }

  /**
   * Escape shell argument for safe command execution
   */
  private escapeShellArg(arg: string): string {
    // Replace single quotes with '\'' and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService()
  }
  return notificationServiceInstance
}
