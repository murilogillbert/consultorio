import { ClinicRepository } from '../repositories/ClinicRepository'
import { AppError } from '../../../shared/errors/AppError'
import { UpdateClinicDto } from '../dtos/updateClinicDto'

const clinicRepository = new ClinicRepository()

export async function updateClinicSettingsService(clinicId: string, dto: UpdateClinicDto) {
  const clinic = await clinicRepository.findById(clinicId)
  if (!clinic) throw new AppError('Clínica não encontrada', 404)
  return clinicRepository.update(clinicId, dto as any)
}
