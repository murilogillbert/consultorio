export interface PostAppointmentData {
  patientName: string
  professionalName: string
  serviceName: string
  reviewLink?: string
}

export function postAppointmentHtml(data: PostAppointmentData): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Como foi sua consulta?</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#6366f1;padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Psicologia e Existir</h1>
          <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Como foi sua experiência?</p>
        </td></tr>
        <tr><td style="padding:40px;text-align:center;">
          <p style="font-size:16px;color:#374151;margin:0 0 16px;">Olá, <strong>${data.patientName}</strong>!</p>
          <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
            Obrigada por confiar em nosso trabalho. Esperamos que sua consulta com <strong>${data.professionalName}</strong> tenha sido uma ótima experiência.
          </p>
          ${data.reviewLink ? `
          <a href="${data.reviewLink}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;margin-bottom:24px;">
            Avaliar minha consulta
          </a>
          <br>` : ''}
          <p style="font-size:14px;color:#9ca3af;">Sua opinião é muito importante para nós e nos ajuda a melhorar sempre.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Psicologia e Existir</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function postAppointmentText(data: PostAppointmentData): string {
  return `Olá, ${data.patientName}!

Obrigada por confiar em nosso trabalho. Esperamos que sua consulta com ${data.professionalName} tenha sido ótima!

${data.reviewLink ? `Que tal avaliar sua experiência? Acesse: ${data.reviewLink}\n\n` : ''}Sua opinião é muito importante para nós.

Psicologia e Existir`
}

export function postAppointmentWhatsApp(data: PostAppointmentData): string {
  return `Olá, ${data.patientName}!

Obrigada por confiar em nosso trabalho. Esperamos que sua consulta com ${data.professionalName} tenha sido uma ótima experiência!

${data.reviewLink ? `Que tal nos contar como foi? Avalie sua consulta:\n${data.reviewLink}\n\n` : ''}Sua opinião é muito importante para nós.

Psicologia e Existir`
}
