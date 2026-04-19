import { ClinicRepository } from '../repositories/ClinicRepository'
import { AppError } from '../../../shared/errors/AppError'

const clinicRepository = new ClinicRepository()

/**
 * Updates clinic logo URL.
 * The actual file upload is handled by the upload middleware (multer/S3).
 * This service just persists the resulting URL.
 */
export async function uploadLogoService(clinicId: string, logoUrl: string) {
  if (!logoUrl) throw new AppError('logoUrl é obrigatório', 400)
  const clinic = await clinicRepository.findById(clinicId)
  if (!clinic) throw new AppError('Clínica não encontrada', 404)
  return clinicRepository.update(clinicId, { logoUrl })
}