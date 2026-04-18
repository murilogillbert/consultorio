import { prisma } from '../../../config/database'
import { emailAdapter } from '../../messaging/channels/email/emailAdapter'
import {
  postAppointmentHtml,
  postAppointmentText,
  postAppointmentWhatsApp,
} from '../templates/postAppointment'
import { buildWhatsappAdapterForClinic, resolveClinicIdFromAppointment } from './notificationDelivery'

export async function sendPostAppointmentService(hoursAfter = 1): Promise<void> {
  const now = new Date()
  const from = new Date(now.getTime() - (hoursAfter + 1) * 60 * 60 * 1000)
  const to = new Date(now.getTime() - hoursAfter * 60 * 60 * 1000)

  const appointments = await prisma.appointment.findMany({
    where: {
      endTime: { gte: from, lte: to },
      status: 'COMPLETED',
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

  console.log(`[Pós-consulta] ${appointments.length} agendamento(s) para mensagem pós-atendimento`)

  for (const appointment of appointments) {
    const data = {
      patientName: appointment.patient.user.name,
      professionalName: appointment.professional.user.name,
      serviceName: appointment.service.name,
    }
    const patientPhone = appointment.patient.phone || appointment.patient.user.phone
    const clinicId = resolveClinicIdFromAppointment(appointment)

    try {
      const result = await emailAdapter.send({
        to: appointment.patient.user.email,
        subject: 'Como foi sua consulta? - Psicologia e Existir',
        html: postAppointmentHtml(data),
        text: postAppointmentText(data),
      })
      console.log(`[Pós-consulta] E-mail enviado para ${appointment.patient.user.email}. ID: ${result.messageId}`)
      if (result.previewUrl) console.log('[Pós-consulta] Preview:', result.previewUrl)
    } catch (err) {
      console.error('[Pós-consulta] Erro no e-mail:', err)
    }

    if (patientPhone) {
      try {
        const wa = await buildWhatsappAdapterForClinic(clinicId)
        await wa.sendTextMessage(patientPhone, postAppointmentWhatsApp(data))
        console.log(`[Pós-consulta] WhatsApp enviado para ${patientPhone}`)
      } catch (err) {
        console.error('[Pós-consulta] Erro no WhatsApp:', err)
      }
    }
  }
}
