import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function linkPatientToConversationService(conversationId: string, patientId: string) {
  const [conversation, patient] = await Promise.all([
    prisma.conversation.findUnique({ where: { id: conversationId } }),
    prisma.patient.findUnique({ where: { id: patientId }, include: { user: true } }),
  ])

  if (!conversation) throw new AppError('Conversa não encontrada', 404)
  if (!patient) throw new AppError('Paciente não encontrado', 404)

  // Link contact to patient
  await prisma.contact.updateMany({
    where: { conversations: { some: { id: conversationId } } },
    data: { patientId },
  })

  return prisma.conversation.findUnique({ where: { id: conversationId }, include: { contact: true } })
}
