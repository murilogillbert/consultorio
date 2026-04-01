import nodemailer from 'nodemailer'
import { env } from '../../config/env'

function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
}

export async function sendOtpEmail(to: string, name: string, otp: string) {
  const transporter = createTransporter()

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
      <h2 style="color:#2D6A4F;margin-bottom:8px">Seu código de acesso</h2>
      <p style="color:#374151">Olá, <strong>${name}</strong>!</p>
      <p style="color:#374151">Use o código abaixo para acessar <strong>Minhas Consultas</strong>:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2D6A4F;background:#F0FDF4;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
        ${otp}
      </div>
      <p style="color:#6B7280;font-size:14px">Este código expira em <strong>10 minutos</strong>.</p>
      <p style="color:#6B7280;font-size:12px;margin-top:24px">Se você não solicitou este código, ignore este email.</p>
    </div>
  `

  if (!transporter) {
    // Dev fallback: exibe no console se SMTP não configurado
    console.log(`\n📧 OTP para ${to}: ${otp}\n`)
    return
  }

  await transporter.sendMail({
    from: `"Clínica" <${env.SMTP_FROM}>`,
    to,
    subject: `${otp} — Seu código de acesso`,
    html,
  })
}
