import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

/**
 * Exclui PERMANENTEMENTE este agendamento e todos os futuros que pertencem
 * à mesma série de recorrência (recurrenceGroupId), a partir do startTime
 * do agendamento informado. Diferente do cancelamento (que mantém o
 * registro em cinza), aqui o registro deixa de existir no banco.
 *
 * Não toca em consultas passadas (startTime < target.startTime).
 * Se o agendamento não tiver recurrenceGroupId, exclui apenas ele.
 *
 * Limpa também as dependências de cada agendamento (Payment, EquipmentUsage)
 * e desvincula reviews associadas para evitar erro de FK.
 */
export async function deleteFutureAppointmentsService(id: string) {
  const target = await prisma.appointment.findUnique({ where: { id } })
  if (!target) throw new AppError('Agendamento não encontrado', 404)

  // Identifica quais agendamentos serão removidos.
  let candidates: { id: string }[]
  if (target.recurrenceGroupId) {
    candidates = await prisma.appointment.findMany({
      where: {
        recurrenceGroupId: target.recurrenceGroupId,
        startTime: { gte: target.startTime },
      },
      select: { id: true },
    })
  } else {
    candidates = [{ id }]
  }

  const ids = candidates.map(c => c.id)
  if (ids.length === 0) {
    return { count: 0, message: 'Nenhum agendamento elegível para exclusão.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.equipmentUsage.deleteMany({ where: { appointmentId: { in: ids } } })
    await tx.payment.deleteMany({ where: { appointmentId: { in: ids } } })
    await tx.professionalReview.updateMany({
      where: { appointmentId: { in: ids } },
      data: { appointmentId: null },
    })
    await tx.appointment.deleteMany({ where: { id: { in: ids } } })
  })

  return { count: ids.length, message: `${ids.length} agendamento(s) excluído(s) permanentemente.` }
}
