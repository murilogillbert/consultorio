import { prisma } from '../../../config/database'
import { WhatsappAdapter } from '../../messaging/channels/whatsapp/whatsappAdapter'
import { resolveWhatsappCredentials } from '../../messaging/services/resolveWhatsappCredentials'

type AppointmentWithClinicContext = {
  room?: { clinicId: string } | null
  professional?: {
    user?: {
      systemUsers?: Array<{ clinicId: string }>
    } | null
  } | null
}

export function resolveClinicIdFromAppointment(appointment: AppointmentWithClinicContext): string | null {
  return appointment.room?.clinicId
    || appointment.professional?.user?.systemUsers?.[0]?.clinicId
    || null
}

export async function resolveClinicIdForPatient(patientId: string): Promise<string | null> {
  const latestAppointment = await prisma.appointment.findFirst({
    where: { patientId },
    orderBy: { startTime: 'desc' },
    include: {
      room: { select: { clinicId: true } },
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
    },
  })

  if (!latestAppointment) {
    return null
  }

  return resolveClinicIdFromAppointment(latestAppointment)
}

export async function buildWhatsappAdapterForClinic(clinicId?: string | null) {
  if (clinicId) {
    const credentials = await resolveWhatsappCredentials({ clinicId })
    if (credentials.accessToken && credentials.phoneNumberId) {
      return new WhatsappAdapter(credentials.accessToken, credentials.phoneNumberId)
    }
  }

  return new WhatsappAdapter()
}
