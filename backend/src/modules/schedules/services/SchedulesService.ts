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
    // 1. Get service duration
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

    // 5. Generate available slots
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

        if (!hasConflict && !hasBlock) {
          availableSlots.push({ startTime: slotStart, endTime: slotEnd })
        }

        currentMinutes += 30 // slots every 30 minutes
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
