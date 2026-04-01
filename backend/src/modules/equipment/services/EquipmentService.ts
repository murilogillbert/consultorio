import { EquipmentRepository } from '../repositories/EquipmentRepository'
import { AppError } from '../../../shared/errors/AppError'
import { Prisma } from '@prisma/client'

export class EquipmentService {
  constructor(private equipmentRepository: EquipmentRepository) {}

  async executeCreate(data: Prisma.EquipmentCreateInput) {
    if (!data.name || !data.category || !data.clinic) {
      throw new AppError('Nome, categoria e clínica do equipamento são obrigatórios', 400)
    }

    const equipment = await this.equipmentRepository.create(data)

    return equipment
  }

  async executeListByClinic(clinicId: string) {
    if (!clinicId) {
      throw new AppError('O ID da clínica é obrigatório para listar os equipamentos', 400)
    }

    return this.equipmentRepository.listByClinic(clinicId)
  }

  async executeFindById(id: string) {
    const equipment = await this.equipmentRepository.findById(id)

    if (!equipment) {
      throw new AppError('Equipamento não encontrado', 404)
    }

    return equipment
  }

  async executeUpdate(id: string, data: Prisma.EquipmentUpdateInput) {
    return this.equipmentRepository.update(id, data)
  }

  async executeDelete(id: string) {
    return this.equipmentRepository.delete(id)
  }
}
