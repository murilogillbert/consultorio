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
}
