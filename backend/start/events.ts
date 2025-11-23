/*
|--------------------------------------------------------------------------
| Event listeners
|--------------------------------------------------------------------------
|
| Register event listeners for the application
|
*/

import emitter from '@adonisjs/core/services/emitter'
import DownloadSuccessEvent from '#events/download_success_event'
import DownloadErrorEvent from '#events/download_error_event'
import SendNotificationOnDownloadSuccess from '#listeners/send_notification_on_download_success'
import SendNotificationOnDownloadError from '#listeners/send_notification_on_download_error'

// Register download success listener
emitter.on(DownloadSuccessEvent, [SendNotificationOnDownloadSuccess])

// Register download error listener
emitter.on(DownloadErrorEvent, [SendNotificationOnDownloadError])
