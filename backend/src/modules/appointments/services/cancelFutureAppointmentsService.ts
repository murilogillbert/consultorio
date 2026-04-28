import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

/**
 * Cancela este agendamento e todos os futuros pertencentes à mesma série
 * de recorrência (recurrenceGroupId), a partir do startTime do agendamento
 * informado. Não toca em consultas passadas, canceladas ou concluídas.
 *
 * Se o agendamento não tiver recurrenceGroupId, cancela apenas ele.
 */
export async function cancelFutureAppointmentsService(
  id: string,
  reason?: string,
  source?: string
) {
  const target = await prisma.appointment.findUnique({ where: { id } })
  if (!target) throw new AppError('Agendamento não encontrado', 404)

  const cancellationSource = (source && source.trim()) || 'RECEPTION'
  const cancelledAt = new Date()

  let where: any
  if (target.recurrenceGroupId) {
    where = {
      recurrenceGroupId: target.recurrenceGroupId,
      startTime: { gte: target.startTime },
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
    }
  } else {
    where = { id }
  }

  const result = await prisma.appointment.updateMany({
    where,
    data: {
      status: 'CANCELLED',
      cancellationReason: reason || null,
      cancellationSource,
      cancelledAt,
    },
  })

  return { count: result.count, message: `${result.count} agendamento(s) cancelado(s).` }
}
