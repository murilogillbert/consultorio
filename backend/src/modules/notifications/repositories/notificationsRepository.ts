import { prisma } from '../../../config/database'

export class NotificationsRepository {
  async findUnreadByUser(userId: string) {
    // Future: query a Notifications table when it's added to the schema
    // For now, return empty array — in-app notifications are via WebSocket
    return []
  }

  async markAsRead(id: string) {
    // Future implementation
    return null
  }
}
