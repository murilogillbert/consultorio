import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export async function deleteUserService(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new AppError('Usuário não encontrado', 404)

  // Block deletion if user has appointments (as patient)
  const patient = await prisma.patient.findUnique({ where: { userId: id } })
  if (patient) {
    const appointmentCount = await prisma.appointment.count({ where: { patientId: patient.id } })
    if (appointmentCount > 0) {
      throw new AppError(
        'Não é possível remover este usuário pois possui consultas registradas. Cancele ou transfira as consultas primeiro.',
        400
      )
    }
  }

  // Block deletion if user has appointments (as professional)
  const professional = await prisma.professional.findUnique({ where: { userId: id } })
  if (professional) {
    const appointmentCount = await prisma.appointment.count({ where: { professionalId: professional.id } })
    if (appointmentCount > 0) {
      throw new AppError(
        'Não é possível remover este usuário pois é um profissional com consultas registradas. Cancele ou transfira as consultas primeiro.',
        400
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    // Collect IDs of messages sent by this user (needed to clean up references)
    const userMessages = await tx.internalMessage.findMany({
      where: { senderId: id },
      select: { id: true },
    })
    const messageIds = userMessages.map((m) => m.id)

    // Collect IDs of announcements published by this user
    const userAnnouncements = await tx.announcement.findMany({
      where: { publishedById: id },
      select: { id: true },
    })
    const announcementIds = userAnnouncements.map((a) => a.id)

    // 1. Clear nullable foreign keys pointing at this user
    await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } })
    await tx.conversation.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } })
    await tx.jobCandidacy.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } })

    // 2. Break reply chains for messages sent by this user before deleting them
    if (messageIds.length > 0) {
      await tx.internalMessage.updateMany({
        where: { replyToId: { in: messageIds } },
        data: { replyToId: null },
      })
      await tx.messageMention.deleteMany({ where: { messageId: { in: messageIds } } })
      await tx.messageRead.deleteMany({ where: { messageId: { in: messageIds } } })
      await tx.pinnedMessage.deleteMany({ where: { messageId: { in: messageIds } } })
    }

    // 3. Delete records that directly reference this user
    await tx.messageMention.deleteMany({ where: { userId: id } })
    await tx.messageRead.deleteMany({ where: { userId: id } })
    await tx.pinnedMessage.deleteMany({ where: { pinnedById: id } })
    await tx.announcementRead.deleteMany({ where: { userId: id } })
    await tx.channelMember.deleteMany({ where: { userId: id } })
    await tx.conversationNote.deleteMany({ where: { authorId: id } })
    await tx.equipmentUsage.deleteMany({ where: { usedById: id } })
    await tx.internalMessage.deleteMany({ where: { senderId: id } })

    // 4. Delete announcements published by this user (reads cleaned up first)
    if (announcementIds.length > 0) {
      await tx.announcementRead.deleteMany({ where: { announcementId: { in: announcementIds } } })
      await tx.announcement.deleteMany({ where: { id: { in: announcementIds } } })
    }

    // 5. Delete patient profile (no appointments — already verified above)
    if (patient) {
      await tx.patient.delete({ where: { id: patient.id } })
    }

    // 6. Delete professional profile and related records (no appointments — already verified)
    if (professional) {
      await tx.professionalService.deleteMany({ where: { professionalId: professional.id } })
      await tx.professionalEducation.deleteMany({ where: { professionalId: professional.id } })
      await tx.professionalCertification.deleteMany({ where: { professionalId: professional.id } })
      await tx.professionalReview.deleteMany({ where: { professionalId: professional.id } })
      await tx.schedule.deleteMany({ where: { professionalId: professional.id } })
      await tx.block.deleteMany({ where: { professionalId: professional.id } })
      await tx.professional.delete({ where: { id: professional.id } })
    }

    // 7. Delete clinic memberships
    await tx.systemUser.deleteMany({ where: { userId: id } })

    // 8. Finally delete the user record itself
    await tx.user.delete({ where: { id } })
  })

  return { message: 'Usuário removido com sucesso' }
}
