import { ProfessionalsRepository } from '../repositories/professionalsRepository'
import { Professional, Prisma, Schedule } from '@prisma/client'
import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

export class ProfessionalsService {
  private professionalsRepository: ProfessionalsRepository

  constructor(professionalsRepository: ProfessionalsRepository) {
    this.professionalsRepository = professionalsRepository
  }

  async executeList(): Promise<Professional[]> {
    return this.professionalsRepository.listActive()
  }

  async executeCreate(data: any): Promise<Professional> {
    // Check if user already is a professional
    const exists = await this.professionalsRepository.list()
    const alreadyProfessional = exists.find(p => p.userId === data.userId)
    if (alreadyProfessional) {
      throw new AppError('Usuário já cadastrado como profissional', 400)
    }

    const { schedules, ...professionalData } = data

    const created = await this.professionalsRepository.create(professionalData)

    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      await prisma.schedule.createMany({
        data: schedules.map((s: any) => ({
          professionalId: created.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          active: true
        }))
      })
    }

    return created
  }

  async executeGet(id: string): Promise<Professional | null> {
    const professional = await this.professionalsRepository.findWithDetails(id)
    if (!professional) {
      throw new AppError('Profissional não encontrado', 404)
    }
    return professional
  }

  async executeUpdate(id: string, data: any): Promise<Professional> {
    const professional = await this.professionalsRepository.findById(id)
    if (!professional) {
      throw new AppError('Profissional não encontrado', 404)
    }

    const { schedules, avatarUrl, ...updateData } = data

    if (avatarUrl !== undefined) {
      await prisma.user.update({
        where: { id: professional.userId },
        data: { avatarUrl },
      })
    }

    const updated = await this.professionalsRepository.update(id, updateData)

    if (schedules && Array.isArray(schedules)) {
      // Delete old schedules
      await prisma.schedule.deleteMany({
        where: { professionalId: id }
      })
      
      // Insert new schedules
      if (schedules.length > 0) {
        await prisma.schedule.createMany({
          data: schedules.map((s: any) => ({
            professionalId: id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            active: true
          }))
        })
      }
    }

    return updated
  }

  async executeToggleActive(id: string): Promise<Professional> {
    const professional = await this.professionalsRepository.findById(id)
    if (!professional) {
      throw new AppError('Profissional não encontrado', 404)
    }
    return this.professionalsRepository.update(id, { active: !professional.active })
  }

  async executeGetAvailability(professionalId: string, date: Date): Promise<any> {
    // Implementation for getting available time slots
    const dayOfWeek = date.getDay()
    const schedules = await prisma.schedule.findMany({
      where: { professionalId, dayOfWeek, active: true },
    })
    
    if (schedules.length === 0) {
      return { available: false, message: 'Profissional não atua neste dia da semana' }
    }

    // Get booked appointments for this date
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const booked = await prisma.appointment.findMany({
      where: {
        professionalId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: 'CANCELLED' },
      },
      select: { startTime: true, endTime: true },
    })

    return { available: true, schedules, booked }
  }
}
