import { MailProvider } from './mailProvider'
import nodemailer from 'nodemailer'
import { env } from '../../../config/env'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export class NodemailerProvider implements MailProvider {
  async sendEmail(params: { to: string; subject: string; html: string; text?: string }) {
    const transporter = getTransporter()
    const result = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })
    return { messageId: result.messageId }
  }
}
