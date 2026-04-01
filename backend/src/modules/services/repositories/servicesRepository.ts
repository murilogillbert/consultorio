import { prisma } from '../../../config/database'
import { Service, Prisma, ServiceInsurance } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class ServicesRepository extends BaseRepository<Service, Prisma.ServiceCreateInput, Prisma.ServiceUpdateInput> {
  constructor() {
    super(prisma.service)
  }

  async findWithDetails(id: string): Promise<Service | null> {
    return prisma.service.findUnique({
      where: { id },
      include: {
        professionals: { include: { professional: { include: { user: true } } } },
        insurances: { include: { insurancePlan: true } },
        equipments: { include: { equipment: true } }
      }
    })
  }

  async listActive(): Promise<Service[]> {
    return prisma.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    })
  }
}

export class ServiceInsuranceRepository extends BaseRepository<ServiceInsurance, Prisma.ServiceInsuranceCreateInput, Prisma.ServiceInsuranceUpdateInput> {
  constructor() {
    super(prisma.serviceInsurance)
  }

  async findByService(serviceId: string): Promise<ServiceInsurance[]> {
    return prisma.serviceInsurance.findMany({
      where: { serviceId },
      include: { insurancePlan: true }
    })
  }
}
