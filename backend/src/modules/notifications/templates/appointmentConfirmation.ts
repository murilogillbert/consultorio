export interface AppointmentConfirmationData {
  patientName: string
  professionalName: string
  serviceName: string
  date: string   // ex: "15/04/2026"
  time: string   // ex: "14:00"
  address?: string
}

export function appointmentConfirmationHtml(data: AppointmentConfirmationData): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Confirmação de Consulta</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#6366f1;padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;">Psicologia e Existir</h1>
          <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px;">Consulta confirmada ✓</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:16px;color:#374151;">Olá, <strong>${data.patientName}</strong>!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Sua consulta foi confirmada. Veja os detalhes abaixo:</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
            <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Profissional</td>
                <td style="color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:right;">${data.professionalName}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Serviço</td>
                <td style="color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:right;">${data.serviceName}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Data</td>
                <td style="color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:right;">${data.date}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;">Horário</td>
                <td style="color:#111827;font-size:14px;font-weight:600;text-align:right;">${data.time}</td></tr>
            ${data.address ? `<tr><td style="color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Local</td>
                <td style="color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${data.address}</td></tr>` : ''}
          </table>
          <p style="margin:24px 0 0;font-size:14px;color:#9ca3af;text-align:center;">Em caso de imprevistos, entre em contato com antecedência.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Psicologia e Existir — Todos os direitos reservados</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function appointmentConfirmationText(data: AppointmentConfirmationData): string {
  return `Olá, ${data.patientName}!

Sua consulta foi confirmada:

• Profissional: ${data.professionalName}
• Serviço: ${data.serviceName}
• Data: ${data.date}
• Horário: ${data.time}${data.address ? `\n• Local: ${data.address}` : ''}

Em caso de imprevistos, entre em contato com antecedência.

Psicologia e Existir`
}

export function appointmentConfirmationWhatsApp(data: AppointmentConfirmationData): string {
  return `✅ *Consulta Confirmada!*

Olá, ${data.patientName}!

Sua consulta está confirmada:

👩‍⚕️ *Profissional:* ${data.professionalName}
📋 *Serviço:* ${data.serviceName}
📅 *Data:* ${data.date}
🕐 *Horário:* ${data.time}${data.address ? `\n📍 *Local:* ${data.address}` : ''}

Em caso de imprevistos, entre em contato conosco com antecedência.

_Psicologia e Existir_ 💜`
}
