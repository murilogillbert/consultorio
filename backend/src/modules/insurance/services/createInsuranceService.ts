import { prisma } from '../../../config/database'
import { CreateInsuranceDto } from '../dtos/createInsuranceDto'

export async function createInsuranceService(dto: CreateInsuranceDto) {
  return prisma.insurancePlan.create({
    data: {
      clinicId: dto.clinicId,
      name: dto.name,
      documentsRequired: dto.documentsRequired,
    },
  })
}