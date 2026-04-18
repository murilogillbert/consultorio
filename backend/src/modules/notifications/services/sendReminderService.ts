import { prisma } from '../../../config/database'
import { emailAdapter } from '../../messaging/channels/email/emailAdapter'
import {
  appointmentReminderHtml,
  appointmentReminderText,
  appointmentReminderWhatsApp,
} from '../templates/appointmentReminder'
import { buildWhatsappAdapterForClinic, resolveClinicIdFromAppointment } from './notificationDelivery'

export async function sendReminderService(withinHours = 24): Promise<void> {
  const now = new Date()
  const until = new Date(now.getTime() + withinHours * 60 * 60 * 1000)

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: now, lte: until },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      reminderSent: false,
    },
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

  console.log(`[Lembrete] ${appointments.length} agendamentos para lembrar (próximas ${withinHours}h)`)

  for (const appointment of appointments) {
    const patientEmail = appointment.patient.user.email
    const patientPhone = appointment.patient.phone || appointment.patient.user.phone
    const hoursUntil = (new Date(appointment.startTime).getTime() - now.getTime()) / (1000 * 60 * 60)
    const clinicId = resolveClinicIdFromAppointment(appointment)

    const data = {
      patientName: appointment.patient.user.name,
      professionalName: appointment.professional.user.name,
      serviceName: appointment.service.name,
      date: new Date(appointment.startTime).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      time: new Date(appointment.startTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      }),
      hoursUntil,
    }

    let sent = false

    try {
      const result = await emailAdapter.send({
        to: patientEmail,
        subject: `Lembrete: sua consulta ${hoursUntil <= 24 ? 'é amanhã' : `em ${Math.round(hoursUntil / 24)} dias`}`,
        html: appointmentReminderHtml(data),
        text: appointmentReminderText(data),
      })
      console.log(`[Lembrete] E-mail enviado para ${patientEmail}. ID: ${result.messageId}`)
      if (result.previewUrl) console.log('[Lembrete] Preview:', result.previewUrl)
      sent = true
    } catch (err) {
      console.error(`[Lembrete] Erro no e-mail para ${patientEmail}:`, err)
    }

    if (patientPhone) {
      try {
        const wa = await buildWhatsappAdapterForClinic(clinicId)
        await wa.sendTextMessage(patientPhone, appointmentReminderWhatsApp(data))
        console.log(`[Lembrete] WhatsApp enviado para ${patientPhone}`)
        sent = true
      } catch (err) {
        console.error(`[Lembrete] Erro no WhatsApp para ${patientPhone}:`, err)
      }
    }

    if (sent) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true },
      })
    }
  }
}
