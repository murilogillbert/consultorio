import { prisma } from '../../../config/database'
import { emailAdapter } from '../../messaging/channels/email/emailAdapter'
import { WhatsappAdapter } from '../../messaging/channels/whatsapp/whatsappAdapter'
import {
  appointmentConfirmationHtml,
  appointmentConfirmationText,
  appointmentConfirmationWhatsApp,
} from '../templates/appointmentConfirmation'

export async function sendConfirmationService(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true } },
      service: true,
    },
  })

  if (!appointment) throw new Error(`Agendamento ${appointmentId} não encontrado`)
  if (appointment.reminderSent) {
    console.log(`[Notificação] Confirmação já enviada para agendamento ${appointmentId}`)
    return
  }

  const patientName = appointment.patient.user.name
  const patientEmail = appointment.patient.user.email
  const patientPhone = appointment.patient.phone || appointment.patient.user.phone

  const date = new Date(appointment.startTime).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const time = new Date(appointment.startTime).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  const data = {
    patientName,
    professionalName: appointment.professional.user.name,
    serviceName: appointment.service.name,
    date,
    time,
  }

  const errors: string[] = []

  // 1. E-mail
  try {
    const result = await emailAdapter.send({
      to: patientEmail,
      subject: `Consulta confirmada — ${data.date} às ${data.time}`,
      html: appointmentConfirmationHtml(data),
      text: appointmentConfirmationText(data),
    })
    console.log(`[Notificação] E-mail de confirmação enviado para ${patientEmail}. ID: ${result.messageId}`)
    if (result.previewUrl) console.log('[Notificação] Preview Ethereal:', result.previewUrl)
  } catch (err) {
    console.error('[Notificação] Erro ao enviar e-mail de confirmação:', err)
    errors.push('email')
  }

  // 2. WhatsApp (se o paciente tiver número)
  if (patientPhone) {
    try {
      const wa = new WhatsappAdapter()
      const message = appointmentConfirmationWhatsApp(data)
      await wa.sendTextMessage(patientPhone, message)
      console.log(`[Notificação] WhatsApp de confirmação enviado para ${patientPhone}`)
    } catch (err) {
      console.error('[Notificação] Erro ao enviar WhatsApp de confirmação:', err)
      errors.push('whatsapp')
    }
  }

  // Marcar reminder como enviado se pelo menos um canal funcionou
  if (errors.length < 2) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    })
  }
}
