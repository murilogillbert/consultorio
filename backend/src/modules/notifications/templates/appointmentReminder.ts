export interface AppointmentReminderData {
  patientName: string
  professionalName: string
  serviceName: string
  date: string
  time: string
  hoursUntil: number
  address?: string
}

function timeLabel(hoursUntil: number): string {
  if (hoursUntil <= 2) return 'em breve'
  if (hoursUntil <= 24) return 'amanhã'
  return `em ${Math.round(hoursUntil / 24)} dias`
}

export function appointmentReminderHtml(data: AppointmentReminderData): string {
  const label = timeLabel(data.hoursUntil)
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Lembrete de Consulta</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#8b5cf6;padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Psicologia e Existir</h1>
          <p style="color:#ddd6fe;margin:8px 0 0;font-size:14px;">🔔 Lembrete: sua consulta é ${label}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">Olá, <strong>${data.patientName}</strong>!</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
            <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Profissional</td><td style="color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${data.professionalName}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Serviço</td><td style="color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${data.serviceName}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Data</td><td style="color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${data.date}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;">Horário</td><td style="color:#111827;font-weight:600;text-align:right;">${data.time}</td></tr>
            ${data.address ? `<tr><td style="color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Local</td><td style="color:#111827;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${data.address}</td></tr>` : ''}
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">Precisa remarcar? Entre em contato o quanto antes.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Psicologia e Existir</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function appointmentReminderText(data: AppointmentReminderData): string {
  const label = timeLabel(data.hoursUntil)
  return `Lembrete: sua consulta é ${label}!

Olá, ${data.patientName}!

• Profissional: ${data.professionalName}
• Serviço: ${data.serviceName}
• Data: ${data.date}
• Horário: ${data.time}${data.address ? '\n• Local: ' + data.address : ''}

Precisa remarcar? Entre em contato o quanto antes.

Psicologia e Existir`
}

export function appointmentReminderWhatsApp(data: AppointmentReminderData): string {
  const label = timeLabel(data.hoursUntil)
  return `🔔 *Lembrete de Consulta*

Olá, ${data.patientName}! Sua consulta é *${label}*:

👩‍⚕️ *Profissional:* ${data.professionalName}
📋 *Serviço:* ${data.serviceName}
📅 *Data:* ${data.date}
🕐 *Horário:* ${data.time}${data.address ? '\n📍 *Local:* ' + data.address : ''}

Precisa remarcar? Entre em contato o quanto antes. 💜

_Psicologia e Existir_`
}
