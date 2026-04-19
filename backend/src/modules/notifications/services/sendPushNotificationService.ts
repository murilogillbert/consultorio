import { emitToUser } from '../../../shared/websocket/socketServer'

/**
 * Sends a real-time push notification to a user via WebSocket.
 * For mobile push (FCM/APNs) — add that integration here when ready.
 */
export async function sendPushNotificationService(params: {
  userId: string
  title: string
  body: string
  type?: string
  data?: Record<string, unknown>
}): Promise<void> {
  emitToUser(params.userId, 'notification:push', {
    title: params.title,
    body: params.body,
    type: params.type ?? 'INFO',
    data: params.data,
    timestamp: new Date().toISOString(),
  })
}
