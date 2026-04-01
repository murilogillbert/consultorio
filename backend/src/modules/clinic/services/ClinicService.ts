import { ClinicRepository } from '../repositories/clinicRepository'
import { AppError } from '../../../shared/errors/AppError'
import { Prisma } from '@prisma/client'

export class ClinicService {
  constructor(private clinicRepository: ClinicRepository) { }

  async executeCreate(data: Prisma.ClinicCreateInput) {
    if (!data.name) {
      throw new AppError('Nome da clínica é obrigatório', 400)
    }

    const clinic = await this.clinicRepository.create(data)

    return clinic
  }

  async executeList() {
    return this.clinicRepository.list(false)
  }

  async executeFindById(id: string) {
    const clinic = await this.clinicRepository.findById(id)

    if (!clinic) {
      throw new AppError('Clínica não encontrada', 404)
    }

    return clinic
  }

  async executeUpdate(id: string, data: Prisma.ClinicUpdateInput) {
    const clinicExists = await this.clinicRepository.findById(id)

    if (!clinicExists) {
      throw new AppError('Clínica não existe para atualizar', 404)
    }

    return this.clinicRepository.update(id, data)
  }
}
