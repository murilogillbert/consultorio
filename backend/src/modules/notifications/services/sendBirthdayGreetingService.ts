import { prisma } from '../../../config/database'
import { emailAdapter } from '../../messaging/channels/email/emailAdapter'
import { WhatsappAdapter } from '../../messaging/channels/whatsapp/whatsappAdapter'
import {
  birthdayGreetingHtml,
  birthdayGreetingText,
  birthdayGreetingWhatsApp,
} from '../templates/birthdayGreeting'

/**
 * Envia parabéns para todos os pacientes que fazem aniversário hoje.
 * Deve ser chamado uma vez por dia (via cron ou endpoint admin).
 */
export async function sendBirthdayGreetingService(): Promise<void> {
  const now = new Date()
  const todayMonth = now.getMonth() + 1
  const todayDay = now.getDate()

  // Busca pacientes com birthDate no dia e mês de hoje
  const patients = await prisma.patient.findMany({
    where: {
      birthDate: { not: null },
      active: true,
    },
    include: { user: true },
  })

  const birthdayPatients = patients.filter((p) => {
    if (!p.birthDate) return false
    const bd = new Date(p.birthDate)
    return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay
  })

  console.log(`[Aniversário] ${birthdayPatients.length} paciente(s) fazem aniversário hoje`)

  for (const patient of birthdayPatients) {
    const data = { patientName: patient.user.name }
    const patientPhone = patient.phone || patient.user.phone

    // E-mail
    try {
      const result = await emailAdapter.send({
        to: patient.user.email,
        subject: `🎂 Feliz Aniversário, ${patient.user.name}!`,
        html: birthdayGreetingHtml(data),
        text: birthdayGreetingText(data),
      })
      console.log(`[Aniversário] E-mail enviado para ${patient.user.email}. ID: ${result.messageId}`)
      if (result.previewUrl) console.log('[Aniversário] Preview:', result.previewUrl)
    } catch (err) {
      console.error(`[Aniversário] Erro no e-mail para ${patient.user.email}:`, err)
    }

    // WhatsApp
    if (patientPhone) {
      try {
        const wa = new WhatsappAdapter()
        await wa.sendTextMessage(patientPhone, birthdayGreetingWhatsApp(data))
        console.log(`[Aniversário] WhatsApp enviado para ${patientPhone}`)
      } catch (err) {
        console.error(`[Aniversário] Erro no WhatsApp para ${patientPhone}:`, err)
      }
    }
  }
}
