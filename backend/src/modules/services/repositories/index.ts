import { prisma } from '../../../config/database'
import { Service, Prisma, ServiceInsurance } from '@prisma/client'

export class ServicesRepository {
  async findAll(): Promise<Service[]> {
    return prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
  }
  /** Alias para findAll — mantido por compatibilidade */
  async listActive(): Promise<Service[]> {
    return this.findAll()
  }
  async findById(id: string): Promise<Service | null> {
    return prisma.service.findUnique({ where: { id } })
  }
  async findWithDetails(id: string): Promise<Service | null> {
    return prisma.service.findUnique({ where: { id } }) as any
  }
  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    return prisma.service.create({ data })
  }
  async update(id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return prisma.service.update({ where: { id }, data })
  }
  async archive(id: string): Promise<Service> {
    return prisma.service.update({ where: { id }, data: { active: false } })
  }
  async delete(id: string): Promise<void> {
    await prisma.service.delete({ where: { id } })
  }
}

export class ServiceInsuranceRepository {
  async findByService(serviceId: string): Promise<ServiceInsurance[]> {
    return prisma.serviceInsurance.findMany({ where: { serviceId } }) as any
  }
}
