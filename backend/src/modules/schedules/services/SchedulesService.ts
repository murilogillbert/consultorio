import { prisma } from '../../../config/database'
import { SchedulesRepository, BlocksRepository } from '../repositories/schedulesRepository'
import { Schedule, Block } from '@prisma/client'
import { AppError } from '../../../shared/errors/AppError'

interface AvailableSlot {
  startTime: string
  endTime: string
}

export class SchedulesService {
  private schedulesRepository: SchedulesRepository
  private blocksRepository: BlocksRepository

  constructor() {
    this.schedulesRepository = new SchedulesRepository()
    this.blocksRepository = new BlocksRepository()
  }

  async executeGetSchedule(professionalId: string): Promise<Schedule[]> {
    return this.schedulesRepository.findByProfessional(professionalId)
  }

  async executeSetSchedule(professionalId: string, slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): Promise<Schedule[]> {
    // Verify professional exists
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } })
    if (!professional) {
      throw new AppError('Profissional não encontrado', 404)
    }

    return this.schedulesRepository.replaceSchedule(professionalId, slots)
  }

  async executeGetAvailableSlots(professionalId: string, date: string, serviceId: string): Promise<AvailableSlot[]> {
    // 1. Get service duration and required equipment
    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) {
      throw new AppError('Serviço não encontrado', 404)
    }
    const durationMinutes = service.duration

    // 2. Get the professional's schedule for the given day of week
    const targetDate = new Date(date + 'T00:00:00')
    const dayOfWeek = targetDate.getDay()

    const schedules = await this.schedulesRepository.findByProfessional(professionalId)
    const daySchedule = schedules.filter(s => s.dayOfWeek === dayOfWeek)

    if (daySchedule.length === 0) {
      return []
    }

    // 3. Get existing appointments for that date
    const dayStart = new Date(date + 'T00:00:00')
    const dayEnd = new Date(date + 'T23:59:59')

    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        startTime: { gte: dayStart },
        endTime: { lte: dayEnd },
        status: { notIn: ['CANCELLED'] }
      }
    })

    // 4. Get blocks for that date
    const blocks = await this.blocksRepository.findByProfessionalInRange(professionalId, dayStart, dayEnd)

    // 5. Pre-fetch equipment requirements for this service
    const serviceEquipments = await prisma.serviceEquipment.findMany({
      where: { serviceId },
      include: { equipment: true }
    })

    // 6. Pre-fetch all equipment usage for the day (for categories this service needs)
    const requiredCategories = [...new Set(serviceEquipments.map(se => se.equipment.category))]
    let dayEquipmentUsages: { equipmentId: string; category: string; startsAt: Date; endsAt: Date }[] = []
    let equipmentCountsByCategory: Record<string, number> = {}

    if (requiredCategories.length > 0) {
      // Count available units per category
      for (const cat of requiredCategories) {
        const count = await prisma.equipment.count({
          where: { category: cat, status: 'AVAILABLE' }
        })
        equipmentCountsByCategory[cat] = count
      }

      // Get all usage for these categories on this day
      const usages = await prisma.equipmentUsage.findMany({
        where: {
          equipment: { category: { in: requiredCategories } },
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          startsAt: { lt: dayEnd },
          endsAt: { gt: dayStart }
        },
        include: { equipment: { select: { category: true } } }
      })
      dayEquipmentUsages = usages.map(u => ({
        equipmentId: u.equipmentId,
        category: u.equipment.category,
        startsAt: u.startsAt,
        endsAt: u.endsAt
      }))
    }

    // 7. Generate available slots
    const availableSlots: AvailableSlot[] = []

    for (const schedule of daySchedule) {
      const [schedStartH, schedStartM] = schedule.startTime.split(':').map(Number)
      const [schedEndH, schedEndM] = schedule.endTime.split(':').map(Number)

      let currentMinutes = schedStartH * 60 + schedStartM
      const endMinutes = schedEndH * 60 + schedEndM

      while (currentMinutes + durationMinutes <= endMinutes) {
        const slotStartH = Math.floor(currentMinutes / 60)
        const slotStartM = currentMinutes % 60
        const slotEndMinutes = currentMinutes + durationMinutes
        const slotEndH = Math.floor(slotEndMinutes / 60)
        const slotEndM = slotEndMinutes % 60

        const slotStart = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`
        const slotEnd = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`

        const slotStartDate = new Date(`${date}T${slotStart}:00`)
        const slotEndDate = new Date(`${date}T${slotEnd}:00`)

        // Check for appointment conflicts
        const hasConflict = appointments.some(apt => {
          const aptStart = new Date(apt.startTime)
          const aptEnd = new Date(apt.endTime)
          return slotStartDate < aptEnd && slotEndDate > aptStart
        })

        // Check for block conflicts
        const hasBlock = blocks.some(block => {
          const blockStart = new Date(block.startTime)
          const blockEnd = new Date(block.endTime)
          return slotStartDate < blockEnd && slotEndDate > blockStart
        })

        // Check equipment availability for this slot
        let hasEquipmentConflict = false
        for (const cat of requiredCategories) {
          const totalUnits = equipmentCountsByCategory[cat] || 0
          const bookedInSlot = dayEquipmentUsages.filter(u =>
            u.category === cat &&
            slotStartDate < u.endsAt && slotEndDate > u.startsAt
          ).length
          if (bookedInSlot >= totalUnits) {
            hasEquipmentConflict = true
            break
          }
        }

        if (!hasConflict && !hasBlock && !hasEquipmentConflict) {
          availableSlots.push({ startTime: slotStart, endTime: slotEnd })
        }

        // Avança em passos iguais à duração do serviço, garantindo que
        // serviços de 60/90/120 minutos não gerem slots sobrepostos e que
        // serviços de 30 minutos continuem oferecendo slots a cada 30.
        currentMinutes += durationMinutes
      }
    }

    return availableSlots
  }

  async executeCreateBlock(professionalId: string, data: { startTime: string; endTime: string; reason?: string }): Promise<Block> {
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } })
    if (!professional) {
      throw new AppError('Profissional não encontrado', 404)
    }

    return this.blocksRepository.create({
      professional: { connect: { id: professionalId } },
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      reason: data.reason
    })
  }

  async executeDeleteBlock(blockId: string): Promise<void> {
    const block = await this.blocksRepository.findById(blockId)
    if (!block) {
      throw new AppError('Bloqueio não encontrado', 404)
    }
    await this.blocksRepository.delete(blockId, true)
  }
}
