import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../../config/database'

function periodToDates(startDate?: string, endDate?: string, period?: string) {
  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) }
  }
  const now = new Date()
  if (period === 'today' || period === 'Hoje') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    return { start: s, end: e }
  }
  if (period === '7d' || period === '7 dias') {
    const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { start: s, end: now }
  }
  if (period === '30d' || period === '30 dias') {
    const s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { start: s, end: now }
  }
  if (period === '3m' || period === '3 meses') {
    const s = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    return { start: s, end: now }
  }
  if (period === '12m' || period === '12 meses') {
    const s = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    return { start: s, end: now }
  }
  // default: últimos 30 dias
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { start, end: now }
}

export class MetricsController {
  async getDashboardData(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, startDate, endDate, period } = req.query as {
        clinicId?: string; startDate?: string; endDate?: string; period?: string
      }

      const now = new Date()
      const { start: firstDayThisMonth, end: lastDayThisMonth } = periodToDates(startDate, endDate, period)

      // Período anterior de igual duração para calcular mudança %
      const periodMs = lastDayThisMonth.getTime() - firstDayThisMonth.getTime()
      const firstDayLastMonth = new Date(firstDayThisMonth.getTime() - periodMs)
      const lastDayLastMonth = new Date(firstDayThisMonth.getTime() - 1)

      // 1. Faturamento do Período e Anterior
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

      // 3. Taxa Ocupação
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
      const npsMedio = reviews._avg.rating ? Math.round(reviews._avg.rating * 20) : 0

      // 5. Histórico Anual (12 meses para o gráfico)
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
        alertas.push({ type: 'danger', text: `Queda de ${Math.abs(faturamentoMudanca).toFixed(1)}% no faturamento este período.`, action: 'Analisar' })
      }
      if (concluidosThisMonth < totalAgendamentosThisMonth / 2 && totalAgendamentosThisMonth > 0) {
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

  async getBillingData(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, startDate, endDate, period } = req.query as {
        clinicId?: string; startDate?: string; endDate?: string; period?: string
      }

      const { start, end } = periodToDates(startDate, endDate, period)

      // 1. Receita por Canal
      const revenueByChannel = await prisma.payment.groupBy({
        by: ['method'],
        _sum: { amount: true },
        where: {
          status: 'PAID',
          paidAt: { gte: start, lte: end },
          appointment: clinicId ? { room: { clinicId } } : undefined
        }
      })

      // 2. Repasses por Profissional (usa commissionPct real)
      const paymentsWithPro = await prisma.payment.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: start, lte: end },
          appointment: clinicId ? { room: { clinicId } } : undefined
        },
        include: {
          appointment: {
            include: {
              professional: { include: { user: true } }
            }
          }
        }
      })

      const proPayouts: Record<string, any> = {}
      paymentsWithPro.forEach(p => {
        const pro = p.appointment.professional
        const proId = pro.id
        const commission = (pro as any).commissionPct ?? 50
        if (!proPayouts[proId]) {
          proPayouts[proId] = {
            id: proId,
            name: pro.user.name,
            appointments: 0,
            gross: 0,
            pct: `${commission}%`,
            net: 0
          }
        }
        proPayouts[proId].appointments += 1
        proPayouts[proId].gross += p.amount
        proPayouts[proId].net += p.amount * (commission / 100)
      })

      // 3. Inadimplência
      const now = new Date()
      const delinquency = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          dueAt: { lt: now },
          appointment: clinicId ? { room: { clinicId } } : undefined
        },
        include: {
          appointment: {
            include: {
              patient: { include: { user: true } },
              service: true
            }
          }
        },
        orderBy: { dueAt: 'asc' },
        take: 10
      })

      res.status(200).json({
        revenueByChannel: revenueByChannel.map(c => ({
          name: c.method,
          value: c._sum.amount || 0
        })),
        payouts: Object.values(proPayouts),
        delinquency: delinquency.map(d => ({
          patient: d.appointment.patient.user.name,
          service: d.appointment.service.name,
          value: d.amount,
          date: d.dueAt,
          days: Math.floor((now.getTime() - d.dueAt!.getTime()) / (1000 * 60 * 60 * 24))
        }))
      })
    } catch (err) {
      next(err)
    }
  }

  async getProfessionalMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, startDate, endDate, period } = req.query as {
        clinicId?: string; startDate?: string; endDate?: string; period?: string
      }

      const { start, end } = periodToDates(startDate, endDate, period)

      const professionals = await prisma.professional.findMany({
        where: clinicId ? { user: { systemUsers: { some: { clinicId } } } } : undefined,
        include: {
          user: true,
          appointments: {
            where: { startTime: { gte: start, lte: end } },
            include: {
              payments: { where: { status: 'PAID' } },
              service: true
            }
          },
          reviews: true,
          schedules: true
        }
      })

      const result = professionals.map(p => {
        const totalAppointments = p.appointments.length
        const totalRevenue = p.appointments.reduce((sum: number, app: any) =>
          sum + (app.payments?.reduce((pSum: number, pay: any) => pSum + pay.amount, 0) || 0), 0
        )
        const avgRating = p.reviews.length > 0
          ? p.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / p.reviews.length
          : 0

        let totalMinutesAvailable = 0
        p.schedules.forEach(schedule => {
          if (schedule.active) {
            const [startH, startM] = schedule.startTime.split(':').map(Number)
            const [endH, endM] = schedule.endTime.split(':').map(Number)
            const dailyMinutes = (endH * 60 + endM) - (startH * 60 + startM)
            const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            const occurrences = Math.ceil(daysInPeriod / 7)
            totalMinutesAvailable += dailyMinutes * occurrences
          }
        })

        const totalMinutesBooked = p.appointments.reduce((sum, app) => {
          const duration = (app.endTime.getTime() - app.startTime.getTime()) / (1000 * 60)
          return sum + duration
        }, 0)

        const occupancy = totalMinutesAvailable > 0
          ? Math.min(100, Math.round((totalMinutesBooked / totalMinutesAvailable) * 100))
          : 0

        return {
          id: p.id,
          name: p.user.name,
          specialty: p.specialty || 'Especialista',
          appointments: totalAppointments,
          revenue: totalRevenue,
          rating: avgRating,
          occupancy,
          commissionPct: (p as any).commissionPct ?? 50
        }
      })

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getMarketingMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, startDate, endDate, period } = req.query as {
        clinicId?: string; startDate?: string; endDate?: string; period?: string
      }
      const { start, end } = periodToDates(startDate, endDate, period)

      const sourcesAgg = await prisma.appointment.groupBy({
        by: ['source'],
        _count: { id: true },
        where: {
          startTime: { gte: start, lte: end },
          room: clinicId ? { clinicId } : undefined,
          source: { not: null }
        }
      })

      const totalApps = await prisma.appointment.count({
        where: {
          startTime: { gte: start, lte: end },
          room: clinicId ? { clinicId } : undefined
        }
      })

      const origins = sourcesAgg.map(s => ({
        name: s.source || 'Direto / Outros',
        value: s._count.id,
        pct: totalApps > 0 ? Math.round((s._count.id / totalApps) * 100) : 0
      }))

      const campaigns = await prisma.campaign.findMany({
        where: {
          clinicId,
          startDate: { lte: end },
          OR: [{ endDate: null }, { endDate: { gte: start } }]
        }
      })

      const campaignData = await Promise.all(campaigns.map(async c => {
        const appointmentsCount = await prisma.appointment.count({
          where: {
            startTime: { gte: c.startDate, lte: c.endDate || end },
            source: c.name
          }
        })

        const conversionRevenue = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'PAID',
            appointment: {
              startTime: { gte: c.startDate, lte: c.endDate || end },
              source: c.name
            }
          }
        })

        const revenue = conversionRevenue._sum.amount || 0
        const cost = c.cost || 0
        const roi = cost > 0 ? (((revenue - cost) / cost) * 100).toFixed(0) + '%' : '∞'

        return {
          name: c.name,
          channel: c.channel,
          period: `${c.startDate.toLocaleDateString('pt-BR')} - ${c.endDate?.toLocaleDateString('pt-BR') || 'Ativo'}`,
          cost: `R$ ${cost.toLocaleString('pt-BR')}`,
          appointments: appointmentsCount,
          cpa: appointmentsCount > 0 ? `R$ ${(cost / appointmentsCount).toFixed(2)}` : 'R$ 0',
          roi
        }
      }))

      res.status(200).json({ origins, campaigns: campaignData })
    } catch (err) {
      next(err)
    }
  }

  async getMovementData(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, date } = req.query as { clinicId?: string, date?: string }
      const targetDate = date ? new Date(date) : new Date()
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59)

      const logs = await prisma.auditLog.findMany({
        where: {
          clinicId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      })

      const events = logs.map(l => ({
        time: l.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        type: l.action.toLowerCase().includes('payment') ? 'payment' : l.action.toLowerCase().includes('cancel') ? 'cancel' : 'arrival',
        description: l.description,
        professional: (l.metadata as any)?.professionalName || '—',
        icon: l.action
      }))

      res.status(200).json(events)
    } catch (err) {
      next(err)
    }
  }

  async getServiceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId, startDate, endDate, period } = req.query as {
        clinicId?: string; startDate?: string; endDate?: string; period?: string
      }

      const { start, end } = periodToDates(startDate, endDate, period)

      const services = await prisma.service.findMany({
        where: clinicId ? { appointments: { some: { room: { clinicId } } } } : undefined,
        include: {
          appointments: {
            where: {
              startTime: { gte: start, lte: end },
              room: clinicId ? { clinicId } : undefined
            },
            include: { payments: { where: { status: 'PAID' } } }
          }
        }
      })

      const result = services.map(s => {
        const totalAppointments = s.appointments.length
        const totalRevenue = s.appointments.reduce((sum: number, app: any) =>
          sum + (app.payments?.reduce((pSum: number, pay: any) => pSum + pay.amount, 0) || 0), 0
        )

        return {
          id: s.id,
          name: s.name,
          count: totalAppointments,
          revenue: totalRevenue,
          avgPrice: totalAppointments > 0 ? totalRevenue / totalAppointments : (s as any).price
        }
      })

      const peakHours: Record<number, number> = {}
      for (let i = 8; i <= 20; i++) peakHours[i] = 0

      const allAppointments = await prisma.appointment.findMany({
        where: {
          startTime: { gte: start, lte: end },
          room: clinicId ? { clinicId } : undefined,
          status: 'COMPLETED'
        }
      })

      allAppointments.forEach(app => {
        const hour = app.startTime.getHours()
        if (peakHours[hour] !== undefined) {
          peakHours[hour]++
        }
      })

      res.status(200).json({
        services: result,
        peakHours: Object.entries(peakHours).map(([hour, count]) => ({
          hour: `${hour.padStart(2, '0')}:00`,
          count
        }))
      })
    } catch (err) {
      next(err)
    }
  }
}
