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

  // 3. Garantir que o email murilogillbert@gmail.com exista para o teste sugerido
  const testEmail = 'murilogillbert@gmail.com'
  let testUser = await prisma.user.findUnique({ where: { email: testEmail } })
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        name: 'Murilo Gilbert',
        email: testEmail,
        passwordHash: 'not-needed-for-otp',
        role: 'PATIENT',
        phone: '(11) 98888-7777'
      }
    })
  }

  let testPatient = await prisma.patient.findUnique({ where: { userId: testUser.id } })
  if (!testPatient) {
    testPatient = await prisma.patient.create({
      data: {
        userId: testUser.id,
        cpf: '999.888.777-66',
        phone: '(11) 98888-7777'
      }
    })
  }

  // Agendar uma consulta para o Murilo
  await prisma.appointment.create({
    data: {
      patientId: testPatient.id,
      professionalId: professionals[0].id,
      serviceId: services[0].id,
      roomId: rooms[0].id,
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 30),
      status: 'CONFIRMED',
      source: 'Google Ads',
      origin: 'ONLINE'
    }
  })

  console.log('✅ Dados de métricas e usuário de teste gerados!')
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
