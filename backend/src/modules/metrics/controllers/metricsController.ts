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
      const periodMs = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - periodMs)
      const prevEnd = new Date(start.getTime() - 1)
      const clinicAppointmentFilter = clinicId ? { room: { clinicId } } : undefined

      const [paidPayments, prevRevenueAgg, totalAppointments, completedAppts] = await Promise.all([
        prisma.payment.findMany({
          where: {
            status: 'PAID',
            paidAt: { gte: start, lte: end },
            appointment: clinicAppointmentFilter
          },
          include: {
            appointment: {
              include: {
                professional: { include: { user: true } }
              }
            }
          }
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'PAID',
            paidAt: { gte: prevStart, lte: prevEnd },
            appointment: clinicAppointmentFilter
          }
        }),
        prisma.appointment.count({
          where: {
            startTime: { gte: start, lte: end },
            room: clinicId ? { clinicId } : undefined
          }
        }),
        prisma.appointment.count({
          where: {
            status: 'COMPLETED',
            startTime: { gte: start, lte: end },
            room: clinicId ? { clinicId } : undefined
          }
        })
      ])

      const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0)
      const prevRevenue = prevRevenueAgg._sum.amount || 0
      const revenueTrend = prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : (totalRevenue > 0 ? 100 : 0)
      const ticketMedio = completedAppts > 0 ? totalRevenue / completedAppts : 0
      const revenueByChannelMap = new Map<string, number>()

      const proPayouts: Record<string, any> = {}
      paidPayments.forEach(payment => {
        revenueByChannelMap.set(payment.method, (revenueByChannelMap.get(payment.method) || 0) + payment.amount)

        const pro = payment.appointment.professional
        const proId = pro.id
        const commission = pro.commissionPct ?? 50
        if (!proPayouts[proId]) {
          proPayouts[proId] = {
            id: proId,
            name: pro.user.name,
            specialty: pro.specialty || 'Especialista',
            appointments: 0,
            gross: 0,
            pct: `${commission}%`,
            net: 0
          }
        }
        proPayouts[proId].appointments += 1
        proPayouts[proId].gross += payment.amount
        proPayouts[proId].net += payment.amount * (commission / 100)
      })

      const payouts = Object.values(proPayouts).sort((a, b) => b.gross - a.gross)
      const totalPayout = payouts.reduce((sum, payout) => sum + payout.net, 0)

      // 3. Inadimplência
      const now = new Date()
      const delinquency = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          dueAt: { lt: now },
          appointment: clinicAppointmentFilter
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

      const totalDelinquency = delinquency.reduce((sum, payment) => sum + payment.amount, 0)

      const monthlyRevenue = []
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
        const agg = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'PAID',
            paidAt: { gte: monthStart, lte: monthEnd },
            appointment: clinicAppointmentFilter
          }
        })

        monthlyRevenue.push({
          month: monthStart.toLocaleString('pt-BR', { month: 'short' }),
          revenue: agg._sum.amount || 0
        })
      }

      res.status(200).json({
        totalRevenue,
        revenueTrend,
        totalPayout,
        receitaLiquida: totalRevenue - totalPayout,
        totalAppointments,
        completedAppts,
        ticketMedio,
        totalDelinquency,
        revenueByChannel: Array.from(revenueByChannelMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        payouts,
        delinquency: delinquency.map(d => ({
          patient: d.appointment.patient.user.name,
          service: d.appointment.service.name,
          value: d.amount,
          date: d.dueAt,
          days: Math.floor((now.getTime() - d.dueAt!.getTime()) / (1000 * 60 * 60 * 24))
        })),
        monthlyRevenue
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

      // Período anterior de igual duração para calcular tendência
      const periodMs = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - periodMs)
      const prevEnd = new Date(start.getTime() - 1)

      const clinicFilter = clinicId ? { user: { systemUsers: { some: { clinicId } } } } : undefined
      const clinicAppointmentFilter = clinicId ? { room: { clinicId } } : undefined

      const [periodPayments, previousPayments] = await Promise.all([
        prisma.payment.findMany({
          where: {
            status: 'PAID',
            paidAt: { gte: start, lte: end },
            appointment: clinicAppointmentFilter
          },
          include: {
            appointment: {
              select: {
                professionalId: true
              }
            }
          }
        }),
        prisma.payment.findMany({
          where: {
            status: 'PAID',
            paidAt: { gte: prevStart, lte: prevEnd },
            appointment: clinicAppointmentFilter
          },
          include: {
            appointment: {
              select: {
                professionalId: true
              }
            }
          }
        })
      ])

      const professionals = await prisma.professional.findMany({
        where: clinicFilter,
        include: {
          user: true,
          appointments: {
            where: { startTime: { gte: start, lte: end } },
            include: {
              service: true,
              patient: true
            }
          },
          reviews: {
            where: { createdAt: { gte: start, lte: end } }
          },
          schedules: true
        }
      })

      // Buscar agendamentos do período anterior para tendência
      const prevAppointments = await prisma.appointment.findMany({
        where: {
          startTime: { gte: prevStart, lte: prevEnd },
          professional: clinicFilter
        },
        select: { professionalId: true }
      })

      const prevByProfessional = new Map<string, { count: number; revenue: number }>()
      prevAppointments.forEach(app => {
        const curr = prevByProfessional.get(app.professionalId) || { count: 0, revenue: 0 }
        curr.count++
        prevByProfessional.set(app.professionalId, curr)
      })

      const currentRevenueByProfessional = new Map<string, number>()
      periodPayments.forEach(payment => {
        const professionalId = payment.appointment.professionalId
        currentRevenueByProfessional.set(
          professionalId,
          (currentRevenueByProfessional.get(professionalId) || 0) + payment.amount
        )
      })

      const prevRevenueByProfessional = new Map<string, number>()
      previousPayments.forEach(payment => {
        const professionalId = payment.appointment.professionalId
        prevRevenueByProfessional.set(
          professionalId,
          (prevRevenueByProfessional.get(professionalId) || 0) + payment.amount
        )
      })

      // Para detectar pacientes novos: buscar primeiro agendamento de cada paciente com cada profissional
      const firstAppointments = await prisma.appointment.groupBy({
        by: ['patientId', 'professionalId'],
        _min: { startTime: true },
        where: {
          professional: clinicFilter
        }
      })

      const firstApptMap = new Map<string, Date>()
      firstAppointments.forEach(fa => {
        const key = `${fa.patientId}__${fa.professionalId}`
        if (fa._min.startTime) firstApptMap.set(key, fa._min.startTime)
      })

      const result = professionals.map(p => {
        const allAppts = p.appointments
        const totalAppointments = allAppts.length

        // Contagem por status
        const completedCount = allAppts.filter(a => a.status === 'COMPLETED').length
        const cancelledCount = allAppts.filter(a => a.status === 'CANCELLED').length
        const noShowCount = allAppts.filter(a => a.status === 'NO_SHOW').length

        // Taxas
        const cancellationRate = totalAppointments > 0
          ? Math.round(((cancelledCount + noShowCount) / totalAppointments) * 100)
          : 0
        const attended = totalAppointments - cancelledCount
        const conversionRate = attended > 0
          ? Math.round((completedCount / attended) * 100)
          : 0

        // Receita
        const totalRevenue = currentRevenueByProfessional.get(p.id) || 0

        // Repasse
        const commissionPct = p.commissionPct ?? 50
        const netPayout = totalRevenue * (commissionPct / 100)

        // Avaliação no período
        const periodReviews = p.reviews
        const avgRating = periodReviews.length > 0
          ? periodReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / periodReviews.length
          : 0
        const reviewCount = periodReviews.length

        // Ocupação
        let totalMinutesAvailable = 0
        p.schedules.forEach(schedule => {
          if (schedule.active) {
            const [sH, sM] = schedule.startTime.split(':').map(Number)
            const [eH, eM] = schedule.endTime.split(':').map(Number)
            const dailyMinutes = (eH * 60 + eM) - (sH * 60 + sM)
            const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            const occurrences = Math.ceil(daysInPeriod / 7)
            totalMinutesAvailable += dailyMinutes * occurrences
          }
        })

        const totalMinutesBooked = allAppts.reduce((sum, app) => {
          const duration = (app.endTime.getTime() - app.startTime.getTime()) / (1000 * 60)
          return sum + duration
        }, 0)

        const occupancy = totalMinutesAvailable > 0
          ? Math.min(100, Math.round((totalMinutesBooked / totalMinutesAvailable) * 100))
          : 0

        // Receita por hora disponível
        const availableHours = totalMinutesAvailable / 60
        const revenuePerHour = availableHours > 0 ? Math.round(totalRevenue / availableHours) : 0

        // Pacientes novos vs recorrentes
        let newPatients = 0
        let returningPatients = 0
        const seenPatients = new Set<string>()
        allAppts.forEach(app => {
          if (seenPatients.has(app.patientId)) return
          seenPatients.add(app.patientId)
          const key = `${app.patientId}__${p.id}`
          const firstDate = firstApptMap.get(key)
          if (firstDate && firstDate >= start && firstDate <= end) {
            newPatients++
          } else {
            returningPatients++
          }
        })

        // Tendência vs período anterior
        const prev = prevByProfessional.get(p.id)
        const prevRevenue = prevRevenueByProfessional.get(p.id) || 0
        const prevCount = prev?.count || 0
        const revenueTrend = prevRevenue > 0
          ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
          : (totalRevenue > 0 ? 100 : 0)
        const appointmentsTrend = prevCount > 0
          ? Math.round(((totalAppointments - prevCount) / prevCount) * 100)
          : (totalAppointments > 0 ? 100 : 0)

        // Status dinâmico
        let status: 'destaque' | 'estavel' | 'atencao' | 'critico' = 'estavel'
        if (cancellationRate > 30 || revenueTrend < -15) {
          status = 'critico'
        } else if (cancellationRate > 20 || occupancy < 40) {
          status = 'atencao'
        } else if (occupancy > 70 && cancellationRate < 10 && revenueTrend >= 0) {
          status = 'destaque'
        }

        return {
          id: p.id,
          name: p.user.name,
          specialty: p.specialty || 'Especialista',
          appointments: totalAppointments,
          completedCount,
          cancelledCount,
          noShowCount,
          cancellationRate,
          conversionRate,
          revenue: totalRevenue,
          netPayout,
          commissionPct,
          rating: avgRating,
          reviewCount,
          occupancy,
          revenuePerHour,
          newPatients,
          returningPatients,
          revenueTrend,
          appointmentsTrend,
          status
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

      // Período anterior para tendência
      const periodMs = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - periodMs)
      const prevEnd = new Date(start.getTime() - 1)

      const clinicAppFilter = clinicId ? { room: { clinicId } } : undefined
      const [periodPayments, previousPayments] = await Promise.all([
        prisma.payment.findMany({
          where: {
            status: 'PAID',
            paidAt: { gte: start, lte: end },
            appointment: clinicAppFilter
          },
          include: {
            appointment: {
              select: {
                serviceId: true
              }
            }
          }
        }),
        prisma.payment.findMany({
          where: {
            status: 'PAID',
            paidAt: { gte: prevStart, lte: prevEnd },
            appointment: clinicAppFilter
          },
          include: {
            appointment: {
              select: {
                serviceId: true
              }
            }
          }
        })
      ])

      const services = await prisma.service.findMany({
        where: clinicId ? { appointments: { some: { room: { clinicId } } } } : undefined,
        include: {
          appointments: {
            where: { startTime: { gte: start, lte: end }, ...clinicAppFilter },
            include: {
              professional: { include: { user: true } }
            }
          },
          professionals: true
        }
      })

      // Agendamentos do período anterior para tendência
      const prevAppointments = await prisma.appointment.findMany({
        where: { startTime: { gte: prevStart, lte: prevEnd }, ...clinicAppFilter },
        select: { serviceId: true }
      })

      const prevByService = new Map<string, { count: number; revenue: number }>()
      prevAppointments.forEach(app => {
        const curr = prevByService.get(app.serviceId) || { count: 0, revenue: 0 }
        curr.count++
        prevByService.set(app.serviceId, curr)
      })

      const currentRevenueByService = new Map<string, number>()
      periodPayments.forEach(payment => {
        const serviceId = payment.appointment.serviceId
        currentRevenueByService.set(serviceId, (currentRevenueByService.get(serviceId) || 0) + payment.amount)
      })

      const prevRevenueByService = new Map<string, number>()
      previousPayments.forEach(payment => {
        const serviceId = payment.appointment.serviceId
        prevRevenueByService.set(serviceId, (prevRevenueByService.get(serviceId) || 0) + payment.amount)
      })

      const result = services.map(s => {
        const allAppts = s.appointments
        const totalAppointments = allAppts.length
        const completedCount = allAppts.filter(a => a.status === 'COMPLETED').length
        const cancelledCount = allAppts.filter(a => a.status === 'CANCELLED').length
        const noShowCount = allAppts.filter(a => a.status === 'NO_SHOW').length

        const cancellationRate = totalAppointments > 0
          ? Math.round(((cancelledCount + noShowCount) / totalAppointments) * 100)
          : 0

        const totalRevenue = currentRevenueByService.get(s.id) || 0
        const avgPrice = completedCount > 0 ? totalRevenue / completedCount : s.price

        // Pacientes únicos e taxa de retorno
        const patientCounts = new Map<string, number>()
        allAppts.forEach(a => patientCounts.set(a.patientId, (patientCounts.get(a.patientId) || 0) + 1))
        const uniquePatients = patientCounts.size
        const returningPatients = Array.from(patientCounts.values()).filter(c => c >= 2).length
        const returnRate = uniquePatients > 0 ? Math.round((returningPatients / uniquePatients) * 100) : 0

        // Duração real média vs planejada
        const completedAppts = allAppts.filter(a => a.status === 'COMPLETED')
        const avgRealDuration = completedAppts.length > 0
          ? Math.round(completedAppts.reduce((sum, a) =>
              sum + (a.endTime.getTime() - a.startTime.getTime()) / (1000 * 60), 0
            ) / completedAppts.length)
          : 0

        // Convênio vs particular
        const insuranceCount = allAppts.filter(a => a.insurancePlanId).length
        const insurancePct = totalAppointments > 0 ? Math.round((insuranceCount / totalAppointments) * 100) : 0

        // R$/hora
        const durationHours = (s.duration * completedCount) / 60
        const revenuePerHour = durationHours > 0 ? Math.round(totalRevenue / durationHours) : 0

        // Profissionais que oferecem este serviço
        const proCount = s.professionals.length

        // Top profissional por volume neste serviço
        const proCounts = new Map<string, { name: string; count: number }>()
        allAppts.forEach(a => {
          const curr = proCounts.get(a.professionalId) || { name: a.professional.user.name, count: 0 }
          curr.count++
          proCounts.set(a.professionalId, curr)
        })
        const topPro = Array.from(proCounts.values()).sort((a, b) => b.count - a.count)[0]

        // Tendência vs período anterior
        const prev = prevByService.get(s.id)
        const prevRevenue = prevRevenueByService.get(s.id) || 0
        const prevCount = prev?.count || 0
        const revenueTrend = prevRevenue > 0
          ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
          : (totalRevenue > 0 ? 100 : 0)
        const countTrend = prevCount > 0
          ? Math.round(((totalAppointments - prevCount) / prevCount) * 100)
          : (totalAppointments > 0 ? 100 : 0)

        // Status dinâmico
        let status: 'em_alta' | 'estavel' | 'atencao' | 'declinio' = 'estavel'
        if (cancellationRate > 30 || revenueTrend < -20) {
          status = 'declinio'
        } else if (cancellationRate > 20 || revenueTrend < -10) {
          status = 'atencao'
        } else if (revenueTrend > 0 && cancellationRate < 10) {
          status = 'em_alta'
        }

        return {
          id: s.id,
          name: s.name,
          category: s.category || 'Geral',
          duration: s.duration,
          price: s.price,
          totalAppointments,
          completedCount,
          cancelledCount,
          noShowCount,
          cancellationRate,
          revenue: totalRevenue,
          avgPrice,
          uniquePatients,
          returningPatients,
          returnRate,
          avgRealDuration,
          insurancePct,
          revenuePerHour,
          proCount,
          topProfessional: topPro?.name || '—',
          revenueTrend,
          countTrend,
          status
        }
      })

      // Horários de pico (só COMPLETED)
      const peakHours: Record<number, number> = {}
      for (let i = 8; i <= 20; i++) peakHours[i] = 0

      const allCompletedAppts = await prisma.appointment.findMany({
        where: { startTime: { gte: start, lte: end }, ...clinicAppFilter, status: 'COMPLETED' }
      })

      allCompletedAppts.forEach(app => {
        const hour = app.startTime.getHours()
        if (peakHours[hour] !== undefined) peakHours[hour]++
      })

      res.status(200).json({
        services: result,
        peakHours: Object.entries(peakHours).map(([hour, count]) => ({
          hour: `${String(hour).padStart(2, '0')}:00`,
          count
        }))
      })
    } catch (err) {
      next(err)
    }
  }
}
