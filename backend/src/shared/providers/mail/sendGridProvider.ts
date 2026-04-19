import { MailProvider } from './mailProvider'

/**
 * SendGrid mail provider — not yet implemented.
 * Install @sendgrid/mail and configure SENDGRID_API_KEY env var to activate.
 */
export class SendGridProvider implements MailProvider {
  async sendEmail(params: { to: string; subject: string; html: string; text?: string }) {
    // TODO: implement with @sendgrid/mail
    console.warn('[SendGrid] Provider not implemented — email not sent to:', params.to)
    return { messageId: 'sendgrid_not_implemented' }
  }
}
