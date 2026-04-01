import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando popular banco de dados com dados default...')

  const passwordHash = await hash('123456', 8)

  // 1. Cria ou Atualiza a Clínica Base
  const mainClinic = await prisma.clinic.upsert({
    where: { id: 'clinic-vitalis-001' },
    update: {},
    create: {
      id: 'clinic-vitalis-001',
      name: 'Clínica Vitalis',
      cnpj: '12.345.678/0001-99',
      address: 'Av. Paulista, 1000 - São Paulo, SP',
      email: 'contato@clinicavitalis.com.br',
      phone: '(11) 99999-9999',
      description: 'Cuidando da sua saúde com excelência.',
      integrationSettings: {
        create: {
          gmailConnected: false,
          waConnected: false,
          igConnected: false,
          mpConnected: false,
        },
      },
    },
  })

  // 2. Cria Usuário Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vitalis.com' },
    update: {},
    create: {
      name: 'Administrador do Sistema',
      email: 'admin@vitalis.com',
      passwordHash,
      role: 'ADMIN',
      systemUsers: {
        create: {
          clinicId: mainClinic.id,
          role: 'ADMIN',
        },
      },
    },
  })

  // 3. Cria Usuário Recepcionista
  const recUser = await prisma.user.upsert({
    where: { email: 'recepcao@vitalis.com' },
    update: {},
    create: {
      name: 'Recepção Principal',
      email: 'recepcao@vitalis.com',
      passwordHash,
      role: 'RECEPTIONIST',
      systemUsers: {
        create: {
          clinicId: mainClinic.id,
          role: 'RECEPTIONIST',
        },
      },
    },
  })

  // 4. Cria Profissional de Saúde
  const docUser = await prisma.user.upsert({
    where: { email: 'dr.carlos@vitalis.com' },
    update: {},
    create: {
      name: 'Dr. Carlos Mendes',
      email: 'dr.carlos@vitalis.com',
      passwordHash,
      role: 'PROFESSIONAL',
      systemUsers: {
        create: {
          clinicId: mainClinic.id,
          role: 'PROFESSIONAL',
        },
      },
    },
  })

  // Vincula perfil Profissional
  const professional = await prisma.professional.upsert({
    where: { userId: docUser.id },
    update: {},
    create: {
      userId: docUser.id,
      crm: '123456-SP',
      councilType: 'CRM',
      specialty: 'Cardiologia',
      bio: 'Especialização em coração.',
      languages: JSON.stringify(['Português', 'Inglês']),
    },
  })

  // 4b. Cria mais profissionais
  const docUser2 = await prisma.user.upsert({
    where: { email: 'dra.maria@vitalis.com' },
    update: {},
    create: {
      name: 'Dra. Maria Santos',
      email: 'dra.maria@vitalis.com',
      passwordHash,
      role: 'PROFESSIONAL',
      systemUsers: { create: { clinicId: mainClinic.id, role: 'PROFESSIONAL' } },
    },
  })
  const professional2 = await prisma.professional.upsert({
    where: { userId: docUser2.id },
    update: {},
    create: { userId: docUser2.id, crm: '654321-SP', councilType: 'CRM', specialty: 'Neurologia', bio: 'Especialista em neurologia clínica.', languages: JSON.stringify(['Português', 'Espanhol']) },
  })

  const docUser3 = await prisma.user.upsert({
    where: { email: 'dra.ana@vitalis.com' },
    update: {},
    create: {
      name: 'Dra. Ana Costa',
      email: 'dra.ana@vitalis.com',
      passwordHash,
      role: 'PROFESSIONAL',
      systemUsers: { create: { clinicId: mainClinic.id, role: 'PROFESSIONAL' } },
    },
  })
  const professional3 = await prisma.professional.upsert({
    where: { userId: docUser3.id },
    update: {},
    create: { userId: docUser3.id, crm: '789012-SP', councilType: 'CRM', specialty: 'Oftalmologia', bio: 'Especialista em cirurgia refrativa e retina.', languages: JSON.stringify(['Português', 'Inglês', 'Francês']) },
  })

  // 5. Cadastra Serviço
  const consultaService = await prisma.service.upsert({
    where: { id: 'service-ecg-001' },
    update: {},
    create: {
      id: 'service-ecg-001',
      name: 'Ecocardiograma',
      description: 'Exame de ultrassom do coração.',
      category: 'Exames',
      duration: 30, // 30 min
      price: 350.0,
      onlineBooking: true,
      professionals: {
        create: {
          professionalId: professional.id,
        },
      },
    },
  })

  // 5b. Mais serviços
  const consultaGeral = await prisma.service.upsert({
    where: { id: 'service-consulta-001' },
    update: {},
    create: {
      id: 'service-consulta-001',
      name: 'Consulta Clínica Geral',
      description: 'Consulta médica geral para avaliação e orientação.',
      shortDescription: 'Avaliação clínica completa',
      category: 'Consultas',
      duration: 30,
      price: 250.0,
      onlineBooking: true,
      professionals: { create: [{ professionalId: professional.id }, { professionalId: professional2.id }] },
    },
  })

  const consultaNeuro = await prisma.service.upsert({
    where: { id: 'service-neuro-001' },
    update: {},
    create: {
      id: 'service-neuro-001',
      name: 'Consulta Neurológica',
      description: 'Avaliação neurológica completa com exame de reflexos e coordenação.',
      shortDescription: 'Avaliação neurológica',
      category: 'Consultas',
      duration: 45,
      price: 400.0,
      preparation: 'Trazer exames anteriores, se houver.',
      onlineBooking: true,
      professionals: { create: { professionalId: professional2.id } },
    },
  })

  const exameOftalmo = await prisma.service.upsert({
    where: { id: 'service-oftalmo-001' },
    update: {},
    create: {
      id: 'service-oftalmo-001',
      name: 'Exame Oftalmológico',
      description: 'Exame completo de acuidade visual, fundo de olho e pressão intraocular.',
      shortDescription: 'Exame de vista completo',
      category: 'Exames',
      duration: 40,
      price: 300.0,
      onlineBooking: true,
      professionals: { create: { professionalId: professional3.id } },
    },
  })

  const checkup = await prisma.service.upsert({
    where: { id: 'service-checkup-001' },
    update: {},
    create: {
      id: 'service-checkup-001',
      name: 'Check-Up Cardiológico',
      description: 'Pacote completo de avaliação cardíaca incluindo ECG, ecocardiograma e teste ergométrico.',
      shortDescription: 'Avaliação cardíaca completa',
      category: 'Pacotes',
      duration: 120,
      price: 1200.0,
      preparation: 'Jejum de 8 horas. Trazer roupas confortáveis para o teste ergométrico.',
      onlineBooking: true,
      professionals: { create: { professionalId: professional.id } },
    },
  })

  // 6. Configura Sala
  const examesRoom = await prisma.room.upsert({
    where: { id: 'room-exames-001' },
    update: {},
    create: {
      id: 'room-exames-001',
      clinicId: mainClinic.id,
      name: 'Sala de Exames 1',
      type: 'Sala de Procedimentos',
    },
  })

  // 7. Configura Equipamento
  const ultrassom = await prisma.equipment.upsert({
    where: { id: 'equip-ultra-001' },
    update: {},
    create: {
      id: 'equip-ultra-001',
      clinicId: mainClinic.id,
      name: 'Ultrassom Portátil Samsung',
      category: 'Imagem',
      isMobile: true,
      defaultRoomId: examesRoom.id,
      currentRoomId: examesRoom.id,
      status: 'AVAILABLE',
      services: {
        create: {
          serviceId: consultaService.id,
          isRequired: true,
        },
      },
    },
  })

  // 7b. Mais salas
  const consultorio1 = await prisma.room.upsert({
    where: { id: 'room-consult-001' },
    update: {},
    create: { id: 'room-consult-001', clinicId: mainClinic.id, name: 'Consultório 1', type: 'Consultório' },
  })
  const consultorio2 = await prisma.room.upsert({
    where: { id: 'room-consult-002' },
    update: {},
    create: { id: 'room-consult-002', clinicId: mainClinic.id, name: 'Consultório 2', type: 'Consultório' },
  })

  // 7c. Schedules (horários de atendimento)
  const weekdays = [1, 2, 3, 4, 5] // Seg-Sex
  for (const day of weekdays) {
    await prisma.schedule.create({ data: { professionalId: professional.id, dayOfWeek: day, startTime: '08:00', endTime: '12:00' } })
    await prisma.schedule.create({ data: { professionalId: professional.id, dayOfWeek: day, startTime: '14:00', endTime: '18:00' } })
    await prisma.schedule.create({ data: { professionalId: professional2.id, dayOfWeek: day, startTime: '09:00', endTime: '13:00' } })
    await prisma.schedule.create({ data: { professionalId: professional2.id, dayOfWeek: day, startTime: '14:00', endTime: '17:00' } })
    await prisma.schedule.create({ data: { professionalId: professional3.id, dayOfWeek: day, startTime: '08:00', endTime: '12:00' } })
  }
  // Sábado para Dr. Carlos
  await prisma.schedule.create({ data: { professionalId: professional.id, dayOfWeek: 6, startTime: '08:00', endTime: '12:00' } })

  // 7d. Convênios
  const unimed = await prisma.insurancePlan.upsert({
    where: { id: 'ins-unimed-001' },
    update: {},
    create: { id: 'ins-unimed-001', clinicId: mainClinic.id, name: 'Unimed' },
  })
  const bradesco = await prisma.insurancePlan.upsert({
    where: { id: 'ins-bradesco-001' },
    update: {},
    create: { id: 'ins-bradesco-001', clinicId: mainClinic.id, name: 'Bradesco Saúde' },
  })
  const sulamerica = await prisma.insurancePlan.upsert({
    where: { id: 'ins-sulamerica-001' },
    update: {},
    create: { id: 'ins-sulamerica-001', clinicId: mainClinic.id, name: 'SulAmérica' },
  })

  // Vincular convênios aos serviços
  await prisma.serviceInsurance.createMany({
    data: [
      { serviceId: consultaService.id, insurancePlanId: unimed.id },
      { serviceId: consultaService.id, insurancePlanId: bradesco.id },
      { serviceId: consultaGeral.id, insurancePlanId: unimed.id },
      { serviceId: consultaGeral.id, insurancePlanId: bradesco.id },
      { serviceId: consultaGeral.id, insurancePlanId: sulamerica.id },
      { serviceId: consultaNeuro.id, insurancePlanId: unimed.id },
      { serviceId: exameOftalmo.id, insurancePlanId: bradesco.id },
    ],
    skipDuplicates: true,
  })

  // 8. Cadastra um Paciente de Teste
  const patientUser = await prisma.user.upsert({
    where: { email: 'paciente@teste.com' },
    update: {},
    create: {
      name: 'João da Silva (Paciente)',
      email: 'paciente@teste.com',
      passwordHash,
      role: 'PATIENT',
    },
  })

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      userId: patientUser.id,
      cpf: '000.111.222-33',
      phone: '(11) 98888-7777',
      birthDate: new Date('1990-01-01'),
    },
  })

  // 8b. Mais pacientes
  const patientUser2 = await prisma.user.upsert({
    where: { email: 'maria.oliveira@teste.com' },
    update: {},
    create: { name: 'Maria Oliveira', email: 'maria.oliveira@teste.com', passwordHash, role: 'PATIENT' },
  })
  const patient2 = await prisma.patient.upsert({
    where: { userId: patientUser2.id },
    update: {},
    create: { userId: patientUser2.id, cpf: '111.222.333-44', phone: '(11) 97777-6666', birthDate: new Date('1985-05-15') },
  })

  const patientUser3 = await prisma.user.upsert({
    where: { email: 'pedro.santos@teste.com' },
    update: {},
    create: { name: 'Pedro Santos', email: 'pedro.santos@teste.com', passwordHash, role: 'PATIENT' },
  })
  const patient3 = await prisma.patient.upsert({
    where: { userId: patientUser3.id },
    update: {},
    create: { userId: patientUser3.id, cpf: '222.333.444-55', phone: '(11) 96666-5555', birthDate: new Date('1978-11-20') },
  })

  const patientUser4 = await prisma.user.upsert({
    where: { email: 'lucia.ferreira@teste.com' },
    update: {},
    create: { name: 'Lúcia Ferreira', email: 'lucia.ferreira@teste.com', passwordHash, role: 'PATIENT' },
  })
  const patient4 = await prisma.patient.upsert({
    where: { userId: patientUser4.id },
    update: {},
    create: { userId: patientUser4.id, cpf: '333.444.555-66', phone: '(11) 95555-4444', birthDate: new Date('1995-08-03') },
  })

  // 9. Agendamentos variados (hoje e dias recentes)
  const today = new Date()
  const makeDate = (daysOffset: number, hour: number, minute: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + daysOffset)
    d.setUTCHours(hour, minute, 0, 0)
    return d
  }

  const appointments = [
    // Hoje
    { patientId: patient.id, professionalId: professional.id, serviceId: consultaService.id, roomId: examesRoom.id, startTime: makeDate(0, 9, 0), endTime: makeDate(0, 9, 30), status: 'CONFIRMED', origin: 'PRESENCIAL' },
    { patientId: patient2.id, professionalId: professional.id, serviceId: consultaGeral.id, roomId: consultorio1.id, startTime: makeDate(0, 10, 0), endTime: makeDate(0, 10, 30), status: 'SCHEDULED', origin: 'ONLINE' },
    { patientId: patient3.id, professionalId: professional2.id, serviceId: consultaNeuro.id, roomId: consultorio2.id, startTime: makeDate(0, 11, 0), endTime: makeDate(0, 11, 45), status: 'CONFIRMED', origin: 'WHATSAPP' },
    { patientId: patient4.id, professionalId: professional3.id, serviceId: exameOftalmo.id, roomId: consultorio1.id, startTime: makeDate(0, 14, 0), endTime: makeDate(0, 14, 40), status: 'SCHEDULED', origin: 'PHONE' },
    { patientId: patient.id, professionalId: professional.id, serviceId: checkup.id, roomId: examesRoom.id, startTime: makeDate(0, 15, 0), endTime: makeDate(0, 17, 0), status: 'SCHEDULED', origin: 'ONLINE' },
    // Ontem
    { patientId: patient2.id, professionalId: professional2.id, serviceId: consultaNeuro.id, roomId: consultorio2.id, startTime: makeDate(-1, 9, 0), endTime: makeDate(-1, 9, 45), status: 'COMPLETED', origin: 'PRESENCIAL' },
    { patientId: patient3.id, professionalId: professional.id, serviceId: consultaGeral.id, roomId: consultorio1.id, startTime: makeDate(-1, 10, 0), endTime: makeDate(-1, 10, 30), status: 'COMPLETED', origin: 'ONLINE' },
    { patientId: patient4.id, professionalId: professional3.id, serviceId: exameOftalmo.id, roomId: consultorio1.id, startTime: makeDate(-1, 14, 0), endTime: makeDate(-1, 14, 40), status: 'CANCELLED', origin: 'WHATSAPP', cancellationReason: 'Paciente solicitou remarcação' },
    // 2 dias atrás
    { patientId: patient.id, professionalId: professional.id, serviceId: consultaService.id, roomId: examesRoom.id, startTime: makeDate(-2, 8, 0), endTime: makeDate(-2, 8, 30), status: 'COMPLETED', origin: 'PRESENCIAL' },
    { patientId: patient2.id, professionalId: professional.id, serviceId: checkup.id, roomId: examesRoom.id, startTime: makeDate(-2, 9, 0), endTime: makeDate(-2, 11, 0), status: 'COMPLETED', origin: 'PHONE' },
    // Amanhã
    { patientId: patient3.id, professionalId: professional2.id, serviceId: consultaNeuro.id, roomId: consultorio2.id, startTime: makeDate(1, 9, 0), endTime: makeDate(1, 9, 45), status: 'SCHEDULED', origin: 'ONLINE' },
    { patientId: patient4.id, professionalId: professional.id, serviceId: consultaGeral.id, roomId: consultorio1.id, startTime: makeDate(1, 10, 0), endTime: makeDate(1, 10, 30), status: 'CONFIRMED', origin: 'WHATSAPP' },
  ]

  for (const apt of appointments) {
    await prisma.appointment.create({ data: apt as any })
  }

  // 10. Pagamentos para agendamentos completos
  const completedApts = await prisma.appointment.findMany({ where: { status: 'COMPLETED' }, include: { service: true } })
  const paymentMethods = ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'INSURANCE']
  for (const apt of completedApts) {
    await prisma.payment.create({
      data: {
        appointmentId: apt.id,
        amount: apt.service?.price || 0,
        method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: 'PAID',
        paidAt: apt.endTime,
      },
    })
  }

  console.log('✅ Banco populado com sucesso!')
  console.log('   Email Admin:  admin@vitalis.com       | Senha: 123456')
  console.log('   Email Recep:  recepcao@vitalis.com    | Senha: 123456')
  console.log('   Email Médico: dr.carlos@vitalis.com   | Senha: 123456')
  console.log(`   ${appointments.length} agendamentos criados!`)
  console.log(`   ${completedApts.length} pagamentos registrados!`)
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
