import { SmsProvider } from './smsProvider'

export class TwilioProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<void> {
    // TODO: implement with twilio SDK
    console.log(`[Twilio SMS] Para ${to}: ${message.slice(0, 50)}...`)
  }
}
