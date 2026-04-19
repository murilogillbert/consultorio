import { ServicesRepository } from '../repositories'
import { Service, Prisma } from '@prisma/client'
import { AppError } from '../../../shared/errors/AppError'

export class ServicesService {
  private servicesRepository: ServicesRepository

  constructor(servicesRepository: ServicesRepository) {
    this.servicesRepository = servicesRepository
  }

  async executeList(): Promise<Service[]> {
    return this.servicesRepository.listActive()
  }

  async executeGet(id: string): Promise<Service | null> {
    const service = await this.servicesRepository.findWithDetails(id)
    if (!service) {
      throw new AppError('Serviço não encontrado', 404)
    }
    return service
  }

  async executeCreate(data: any): Promise<Service> {
    const { insuranceIds, professionalIds, roomId, ...rest } = data

    const createData: any = { ...rest }

    if (insuranceIds && Array.isArray(insuranceIds) && insuranceIds.length > 0) {
      createData.insurances = {
        create: insuranceIds.map((id: string) => ({ insurancePlanId: id }))
      }
    }

    if (professionalIds && Array.isArray(professionalIds) && professionalIds.length > 0) {
      createData.professionals = {
        create: professionalIds.map((id: string) => ({ professionalId: id }))
      }
    }

    return this.servicesRepository.create(createData)
  }

  async executeUpdate(id: string, data: any): Promise<Service> {
    const service = await this.servicesRepository.findById(id)
    if (!service) {
      throw new AppError('Serviço não encontrado', 404)
    }

    const { insuranceIds, professionalIds, roomId, ...rest } = data

    const updateData: any = { ...rest }

    if (insuranceIds) {
      updateData.insurances = {
        deleteMany: {},
        create: insuranceIds.map((id: string) => ({ insurancePlanId: id }))
      }
    }

    if (professionalIds) {
      updateData.professionals = {
        deleteMany: {},
        create: professionalIds.map((id: string) => ({ professionalId: id }))
      }
    }

    // In this schema, roomId is likely linked via appointments or equipment. 
    // If it's a simple field in Service, we'd add it here.
    // For now we'll just pass it if it's in the rest of the data or handle it specifically.

    return this.servicesRepository.update(id, updateData)
  }

  async executeArchive(id: string): Promise<Service | void> {
    const service = await this.servicesRepository.findById(id)
    if (!service) {
      throw new AppError('Serviço não encontrado', 404)
    }
    return this.servicesRepository.delete(id)
  }
}
