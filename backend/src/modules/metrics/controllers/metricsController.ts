import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../../config/database'

export class MetricsController {
  async getDashboardData(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.query as { clinicId?: string }
      
      const now = new Date()
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      // 1. Faturamento do Mês e Anterior
      const paymentsThisMonth = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          paidAt: { gte: firstDayThisMonth, lte: lastDayThisMonth },
          appointment: clinicId ? { room: { clinicId } } : undefined
        }
      })

      const paymentsLastMonth = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          paidAt: { gte: firstDayLastMonth, lte: lastDayLastMonth },
          appointment: clinicId ? { room: { clinicId } } : undefined
        }
      })

      const faturamentoMes = paymentsThisMonth._sum.amount || 0
      const faturamentoAnterior = paymentsLastMonth._sum.amount || 0
      const faturamentoMudanca = faturamentoAnterior > 0 
        ? ((faturamentoMes - faturamentoAnterior) / faturamentoAnterior) * 100 
        : 0

      // 2. Agendamentos
      const totalAgendamentosThisMonth = await prisma.appointment.count({
        where: {
          startTime: { gte: firstDayThisMonth, lte: lastDayThisMonth },
          room: clinicId ? { clinicId } : undefined
        }
      })

      const concluidosThisMonth = await prisma.appointment.count({
        where: {
          status: 'COMPLETED',
          startTime: { gte: firstDayThisMonth, lte: lastDayThisMonth },
          room: clinicId ? { clinicId } : undefined
        }
      })

      // 3. Taxa Ocupação (Simulada baseada em completados vs totais pro MVP caso totalAgendamentos < n)
      const taxaOcupacao = totalAgendamentosThisMonth > 0 
        ? Math.round((concluidosThisMonth / totalAgendamentosThisMonth) * 100) 
        : 0

      // 4. NPS Médio
      const reviews = await prisma.professionalReview.aggregate({
        _avg: { rating: true },
        where: {
          professional: clinicId ? { user: { systemUsers: { some: { clinicId } } } } : undefined
        }
      })
      const npsMedio = reviews._avg.rating ? Math.round(reviews._avg.rating * 20) : 0 // Se 1-5, x20 = 0-100

      // 5. Histórico Anual (Gráfico 12 meses)
      const faturamentoAnual = []
      for (let i = 11; i >= 0; i--) {
        const dStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const agg = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'PAID',
            paidAt: { gte: dStart, lte: dEnd },
            appointment: clinicId ? { room: { clinicId } } : undefined
          }
        })
        faturamentoAnual.push({
          month: dStart.toLocaleString('pt-BR', { month: 'short' }),
          revenue: agg._sum.amount || 0
        })
      }

      // 6. Top Serviços
      const topServicesAgg = await prisma.appointment.groupBy({
        by: ['serviceId'],
        _count: { id: true },
        where: {
          status: 'COMPLETED',
          startTime: { gte: firstDayThisMonth, lte: lastDayThisMonth },
          room: clinicId ? { clinicId } : undefined
        },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })

      const topServices = []
      for (const t of topServicesAgg) {
        const s = await prisma.service.findUnique({ where: { id: t.serviceId } })
        if (s) {
          const rev = await prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
              status: 'PAID',
              appointment: { serviceId: s.id }
            }
          })
          topServices.push({
            name: s.name,
            count: t._count.id,
            revenue: rev._sum.amount || 0
          })
        }
      }

      // 7. Alertas
      const alertas = []
      if (faturamentoMudanca < 0) {
        alertas.push({ type: 'danger', text: `Queda de ${Math.abs(faturamentoMudanca).toFixed(1)}% no faturamento este mês.`, action: 'Analisar' })
      }
      if (concluidosThisMonth < totalAgendamentosThisMonth / 2) {
        alertas.push({ type: 'warning', text: 'Alta taxa de cancelamentos ou ausências detectada.', action: 'Projetar' })
      }
      if (alertas.length === 0) {
        alertas.push({ type: 'success', text: 'Todas as métricas operacionais estão saudáveis.', action: 'OK' })
      }

      res.status(200).json({
        metrics: {
          faturamentoMes,
          faturamentoMudanca,
          totalAgendamentos: totalAgendamentosThisMonth,
          concluidosAgendamentos: concluidosThisMonth,
          taxaOcupacao,
          npsMedio
        },
        charts: {
          faturamentoAnual,
          topServices
        },
        alertas
      })
    } catch (err) {
      next(err)
    }
  }
}
