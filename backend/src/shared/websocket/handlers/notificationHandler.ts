import { Socket, Namespace } from 'socket.io'

interface NotificationPayload {
  id:      string
  type:    string   // 'appointment' | 'message' | 'announcement' | 'system'
  title:   string
  body:    string
  data?:   Record<string, unknown>
  createdAt: string
}

/**
 * Handler de notificações em tempo real.
 *
 * Eventos recebidos (cliente → server):
 *   notification:mark_read  { notificationId }  — marca como lida
 *
 * Eventos emitidos (server → cliente):
 *   notification:new         { notification }    — nova notificação
 *   notification:badge       { count }           — contagem de não lidas
 *
 * Para enviar uma notificação a partir de qualquer service, use emitToUser():
 *   emitToUser(userId, 'notification:new', { notification: { ... } })
 */
export function registerNotificationHandler(socket: Socket, _ns: Namespace) {
  // Marca notificação como lida (placeholder — lógica completa no módulo audit/notifications)
  socket.on('notification:mark_read', (data: { notificationId: string }) => {
    if (!data?.notificationId) return
    // O ACK é suficiente por enquanto; o módulo de notificações implementará a persistência
    socket.emit('notification:read_ack', { notificationId: data.notificationId, ok: true })
  })
}

/**
 * Utilitários de emissão — usados por services/controllers externos.
 * Importar `emitToUser` de socketServer.ts; estas funções são helpers tipados.
 */
export function buildNotification(
  type: NotificationPayload['type'],
  title: string,
  body: string,
  data?: Record<string, unknown>
): NotificationPayload {
  return {
    id:        crypto.randomUUID(),
    type,
    title,
    body,
    data,
    createdAt: new Date().toISOString(),
  }
}
