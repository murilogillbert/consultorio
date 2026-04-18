import { whatsappConfig } from '../../../../config/whatsapp'

export interface WhatsappMessageResponse {
  messaging_product: string
  contacts: { input: string; wa_id: string }[]
  messages: { id: string }[]
}

export class WhatsappAdapter {
  private readonly baseUrl: string
  private readonly token: string
  private readonly phoneId: string

  constructor(customToken?: string, customPhoneId?: string) {
    this.baseUrl = whatsappConfig.apiUrl
    this.token = customToken || whatsappConfig.accessToken || ''
    this.phoneId = customPhoneId || whatsappConfig.phoneNumberId || ''
  }

  private normalizePhone(to: string) {
    return to.replace(/\D/g, '')
  }

  private async fetchApi<T>(endpoint: string, options: RequestInit): Promise<T> {
    if (!this.token || !this.phoneId) {
      throw new Error('WhatsApp configuration missing: Access Token or Phone ID')
    }

    const response = await fetch(`${this.baseUrl}/${this.phoneId}/${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json() as any

    if (!response.ok) {
      console.error('WhatsApp API Error:', data)
      throw new Error(data.error?.message || 'Error communicating with WhatsApp API')
    }

    return data as T
  }

  async sendTextMessage(to: string, text: string): Promise<WhatsappMessageResponse> {
    return this.fetchApi<WhatsappMessageResponse>('messages', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.normalizePhone(to),
        type: 'text',
        text: { body: text },
      }),
    })
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'pt_BR',
    components: any[] = [],
  ): Promise<WhatsappMessageResponse> {
    return this.fetchApi<WhatsappMessageResponse>('messages', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.normalizePhone(to),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    })
  }
}
