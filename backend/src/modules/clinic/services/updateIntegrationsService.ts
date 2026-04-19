import { ClinicRepository } from '../repositories/ClinicRepository'
import { prisma } from '../../../config/database'
import { AppError } from '../../../shared/errors/AppError'

const clinicRepository = new ClinicRepository()

export async function updateIntegrationsService(clinicId: string, data: Record<string, unknown>) {
  const clinic = await clinicRepository.findById(clinicId)
  if (!clinic) throw new AppError('Clínica não encontrada', 404)

  return prisma.integrationSettings.upsert({
    where: { clinicId },
    create: { clinicId, ...(data as any) },
    update: data as any,
  })
}