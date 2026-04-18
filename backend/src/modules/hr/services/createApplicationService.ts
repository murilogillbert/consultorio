import { ApplicationsRepository } from '../repositories/applicationsRepository'
import { CreateApplicationDto } from '../dtos/createApplicationDto'

const repo = new ApplicationsRepository()

export async function createApplicationService(dto: CreateApplicationDto) {
  return repo.create({
    jobOpeningId: dto.jobOpeningId,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    message: dto.message,
    resumeUrl: dto.resumeUrl,
  })
}
