import { ApplicationsRepository } from '../repositories/applicationsRepository'

const repo = new ApplicationsRepository()

/**
 * Marks a candidacy as TALENT_POOL — a candidate to keep on file
 * even when not tied to a specific opening.
 */
export async function addToTalentPoolService(candidacyId: string, reviewedById: string) {
  return repo.updateStatus(candidacyId, 'TALENT_POOL', reviewedById)
}