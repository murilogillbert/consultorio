export interface SendInternalMessageDto {
  channelId: string
  senderId: string
  content: string
  replyToId?: string
}
