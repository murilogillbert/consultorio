import { prisma } from '../../../config/database'
import { InsurancePlan, Prisma } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class InsurancePlanRepository extends BaseRepository<InsurancePlan, Prisma.InsurancePlanCreateInput, Prisma.InsurancePlanUpdateInput> {
  constructor() {
    super(prisma.insurancePlan)
  }

  async findByClinic(clinicId: string): Promise<InsurancePlan[]> {
    return prisma.insurancePlan.findMany({
      where: { clinicId, active: true },
      orderBy: { name: 'asc' }
    })
  }

  async findWithServices(id: string): Promise<InsurancePlan | null> {
    return prisma.insurancePlan.findUnique({
      where: { id },
      include: {
        serviceInsurances: {
          include: { service: true }
        }
      }
    })
  }
}
