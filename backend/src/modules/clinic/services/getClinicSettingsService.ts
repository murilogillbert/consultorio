import { ClinicRepository } from '../repositories/ClinicRepository'
import { AppError } from '../../../shared/errors/AppError'

const clinicRepository = new ClinicRepository()

export async function getClinicSettingsService(clinicId: string) {
  const clinic = await clinicRepository.findById(clinicId)
  if (!clinic) throw new AppError('Clínica não encontrada', 404)
  return clinic
}
