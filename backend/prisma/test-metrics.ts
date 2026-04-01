import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  const clinicId = 'clinic-vitalis-001'
  const now = new Date()
  
  // Período amplo para não errar por fuso ou virada de mês
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  console.log('--- TESTE DE MÉTRICAS (DEPURAÇÃO) ---')

  const totalApps = await prisma.appointment.count()
  console.log('Total de Agendamentos no Banco:', totalApps)

  const appsWithSource = await prisma.appointment.findMany({
    where: { source: { not: null } },
    select: { source: true, startTime: true }
  })
  console.log('Agendamentos com Source:', appsWithSource.length)
  if (appsWithSource.length > 0) {
    console.log('Exemplo de Source:', appsWithSource[0].source)
    console.log('Data do Exemplo:', appsWithSource[0].startTime)
  }

  // 1. Origens
  const sourcesAgg = await prisma.appointment.groupBy({
    by: ['source'],
    _count: { id: true },
    where: { 
      room: { clinicId }, 
      startTime: { gte: start, lte: end }, 
      source: { not: null } 
    }
  })
  console.log('Origens Agregadas:', JSON.stringify(sourcesAgg, null, 2))

  // 2. ROI de Campanhas
  const campaigns = await prisma.campaign.findMany({ where: { clinicId } })
  console.log('Campanhas Encontradas:', campaigns.length)

  for (const c of campaigns) {
    // Busca exatamente pelo nome da campanha que definimos no seed-metrics
    const apps = await prisma.appointment.count({
      where: { 
        source: c.name, 
        startTime: { gte: start, lte: end },
        room: { clinicId }
      }
    })
    
    const revenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { 
        status: 'PAID', 
        appointment: { 
          source: c.name, 
          startTime: { gte: start, lte: end },
          room: { clinicId }
        } 
      }
    })
    
    const revVal = revenue._sum.amount || 0
    const cost = c.cost || 0
    const roi = cost > 0 ? ((revVal - cost) / cost) * 100 : 0
    console.log(`Campanha: ${c.name} | Apps: ${apps} | Receita: ${revVal} | Custo: ${cost} | ROI: ${roi.toFixed(2)}%`)
  }
}

test().finally(() => prisma.$disconnect())
