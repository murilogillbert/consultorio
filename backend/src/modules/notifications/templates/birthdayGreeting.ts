export interface BirthdayGreetingData {
  patientName: string
}

export function birthdayGreetingHtml(data: BirthdayGreetingData): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Feliz Aniversário!</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#ec4899,#8b5cf6);padding:40px;text-align:center;">
          <p style="font-size:48px;margin:0;">🎂</p>
          <h1 style="color:#fff;margin:16px 0 0;font-size:24px;">Feliz Aniversário!</h1>
        </td></tr>
        <tr><td style="padding:40px;text-align:center;">
          <p style="font-size:18px;color:#374151;margin:0 0 16px;">Olá, <strong>${data.patientName}</strong>! 🎉</p>
          <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
            Hoje é um dia especial — e nós da <strong>Psicologia e Existir</strong> queremos celebrar junto com você!<br><br>
            Que este novo ciclo traga muita saúde, autoconhecimento e momentos de alegria. Você merece!
          </p>
          <p style="font-size:28px;margin:0;">💜</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Com carinho, Psicologia e Existir</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function birthdayGreetingText(data: BirthdayGreetingData): string {
  return `Feliz Aniversário, ${data.patientName}! 🎂

Hoje é um dia especial e nós da Psicologia e Existir queremos celebrar junto com você!

Que este novo ciclo traga muita saúde, autoconhecimento e momentos de alegria. Você merece!

Com carinho,
Psicologia e Existir 💜`
}

export function birthdayGreetingWhatsApp(data: BirthdayGreetingData): string {
  return `🎂 *Feliz Aniversário, ${data.patientName}!* 🎉

Hoje é um dia muito especial, e nós da *Psicologia e Existir* queremos celebrar junto com você!

Que este novo ciclo traga muito autoconhecimento, saúde e momentos de alegria. Você merece! 💜

_Com carinho, Psicologia e Existir_`
}
