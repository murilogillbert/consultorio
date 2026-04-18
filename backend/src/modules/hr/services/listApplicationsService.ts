import { ApplicationsRepository } from '../repositories/applicationsRepository'

const repo = new ApplicationsRepository()

export async function listApplicationsService(jobOpeningId?: string) {
  if (jobOpeningId) return repo.findByJob(jobOpeningId)
  return repo.findAll()
}
