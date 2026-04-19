import { WhatsAppProvider } from './whatsappProvider'

/**
 * WhatsApp Business API provider stub.
 * The actual WhatsApp Business API adapter lives in:
 * src/modules/messaging/channels/whatsapp/whatsappAdapter.ts
 */
export class WhatsAppBusinessProvider implements WhatsAppProvider {
  async sendText(to: string, message: string): Promise<{ messageId: string }> {
    // TODO: implement with WhatsApp Business API
    console.warn('[WhatsApp Business] Provider not fully implemented — text not sent to:', to)
    return { messageId: `wa_${Date.now()}` }
  }

  async sendTemplate(to: string, template: string, language: string, components: unknown[]): Promise<{ messageId: string }> {
    // TODO: implement with WhatsApp Business API
    console.warn('[WhatsApp Business] Provider not fully implemented — template not sent to:', to)
    return { messageId: `wa_${Date.now()}` }
  }
}
