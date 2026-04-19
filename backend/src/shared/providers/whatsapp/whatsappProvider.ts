export interface WhatsAppProvider {
  sendText(to: string, message: string): Promise<{ messageId: string }>
  sendTemplate(to: string, template: string, language: string, components: unknown[]): Promise<{ messageId: string }>
}
