export interface MailProvider {
  sendEmail(params: {
    to: string
    subject: string
    html: string
    text?: string
  }): Promise<{ messageId: string; previewUrl?: string }>
}
