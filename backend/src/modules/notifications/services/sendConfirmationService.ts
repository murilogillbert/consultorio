import { prisma } from '../../../config/database'
import { emailAdapter } from '../../messaging/channels/email/emailAdapter'
import {
  appointmentConfirmationHtml,
  appointmentConfirmationText,
  appointmentConfirmationWhatsApp,
} from '../templates/appointmentConfirmation'
import { buildWhatsappAdapterForClinic, resolveClinicIdFromAppointment } from './notificationDelivery'

export async function sendConfirmationService(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      professional: {
        include: {
          user: {
            include: {
              systemUsers: {
                where: { active: true },
                select: { clinicId: true },
                take: 1,
              },
            },
          },
        },
      },
      room: { select: { clinicId: true } },
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
  const clinicId = resolveClinicIdFromAppointment(appointment)

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

  try {
    const result = await emailAdapter.send({
      to: patientEmail,
      subject: `Consulta confirmada - ${data.date} às ${data.time}`,
      html: appointmentConfirmationHtml(data),
      text: appointmentConfirmationText(data),
    })
    console.log(`[Notificação] E-mail de confirmação enviado para ${patientEmail}. ID: ${result.messageId}`)
    if (result.previewUrl) console.log('[Notificação] Preview Ethereal:', result.previewUrl)
  } catch (err) {
    console.error('[Notificação] Erro ao enviar e-mail de confirmação:', err)
    errors.push('email')
  }

  if (patientPhone) {
    try {
      const wa = await buildWhatsappAdapterForClinic(clinicId)
      const message = appointmentConfirmationWhatsApp(data)
      await wa.sendTextMessage(patientPhone, message)
      console.log(`[Notificação] WhatsApp de confirmação enviado para ${patientPhone}`)
    } catch (err) {
      console.error('[Notificação] Erro ao enviar WhatsApp de confirmação:', err)
      errors.push('whatsapp')
    }
  }

  if (errors.length === 0) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    })
  }
}
