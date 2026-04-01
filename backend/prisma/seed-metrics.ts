import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 Gerando dados de teste para métricas...')

  const clinicId = 'clinic-vitalis-001'
  const now = new Date()
  
  // 1. Criar Campanhas
  const campaigns = [
    { name: 'Campanha Google Março', channel: 'Google Ads', budget: 1000, cost: 800, startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1), endDate: new Date(now.getFullYear(), now.getMonth() - 1, 30) },
    { name: 'Instagram Influencers', channel: 'Instagram', budget: 2000, cost: 1500, startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: null },
    { name: 'Facebook Health', channel: 'Facebook', budget: 500, cost: 450, startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: null },
  ]

  for (const c of campaigns) {
    await prisma.campaign.create({
      data: { ...c, clinicId }
    })
  }

  // 2. Criar Agendamentos com Fontes (Sources) para ROI
  const patients = await prisma.patient.findMany({ take: 5 })
  const professionals = await prisma.professional.findMany({ take: 2 })
  const services = await prisma.service.findMany({ take: 3 })
  const rooms = await prisma.room.findMany({ take: 2 })

  const sources = ['Google Ads', 'Instagram', 'Facebook', 'Indicação', 'Site']
  
  for (let i = 0; i < 30; i++) {
    const randomDay = Math.floor(Math.random() * 30)
    const randomHour = 8 + Math.floor(Math.random() * 12)
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - randomDay, randomHour, 0)
    const endTime = new Date(startTime.getTime() + 30 * 60000)
    const source = sources[Math.floor(Math.random() * sources.length)]

    const app = await prisma.appointment.create({
      data: {
        patientId: patients[i % patients.length].id,
        professionalId: professionals[i % professionals.length].id,
        serviceId: services[i % services.length].id,
        roomId: rooms[i % rooms.length].id,
        startTime,
        endTime,
        status: 'COMPLETED',
        source,
        origin: 'ONLINE'
      }
    })

    // Pagamento para gerar Receita/ROI
    await prisma.payment.create({
      data: {
        appointmentId: app.id,
        amount: services[i % services.length].price,
        method: 'PIX',
        status: 'PAID',
        paidAt: endTime
      }
    })

    // Auditoria para Página de Movimento
    await prisma.auditLog.create({
      data: {
        clinicId,
        action: 'PAYMENT_CONFIRMED',
        description: `Pagamento de ${services[i % services.length].name} confirmado via PIX`,
        createdAt: startTime,
        metadata: { professionalName: professionals[i % professionals.length].id }
      }
    })
  }

  console.log('✅ Dados de métricas gerados!')
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
