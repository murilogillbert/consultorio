import nodemailer, { Transporter } from 'nodemailer'
import { env } from '../../../../config/env'

interface SendMailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export class EmailAdapter {
  private transporter: Transporter | null = null

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter

    // Se SMTP_HOST estiver configurado, usa SMTP real
    if (env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: Number(env.SMTP_PORT) === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })
      console.log('[Email] Usando SMTP real:', env.SMTP_HOST)
      return this.transporter
    }

    // Fallback: Ethereal (cria conta descartável automaticamente para testes)
    const testAccount = await nodemailer.createTestAccount()
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log('[Email] Usando Ethereal (teste). Conta:', testAccount.user)
    return this.transporter
  }

  async send(options: SendMailOptions): Promise<{ messageId: string; previewUrl?: string }> {
    const transport = await this.getTransporter()

    const fromName = process.env.SMTP_FROM_NAME || 'Psicologia e Existir'
    const fromEmail = env.SMTP_FROM || 'noreply@psicologiaeexistir.com.br'

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined

    if (previewUrl) {
      console.log('[Email] Preview (Ethereal):', previewUrl)
    }

    return { messageId: info.messageId, previewUrl: previewUrl || undefined }
  }
}

// Singleton para reutilizar o transporter entre requisições
export const emailAdapter = new EmailAdapter()
