import { PatientsRepository } from '../repositories/PatientsRepository'
import { Patient, Prisma } from '@prisma/client'
import { AppError } from '../../../shared/errors/AppError'

export class PatientsService {
  private patientsRepository: PatientsRepository

  constructor(patientsRepository: PatientsRepository) {
    this.patientsRepository = patientsRepository
  }

  async executeList(): Promise<Patient[]> {
    return this.patientsRepository.list(false)
  }

  async executeCreate(data: Prisma.PatientUncheckedCreateInput): Promise<Patient> {
    const patientExists = await this.patientsRepository.findByUserId(data.userId)
    if (patientExists) {
      throw new AppError('Este usuário já tem um perfil de paciente', 400)
    }

    if (data.cpf) {
      const cpfExists = await this.patientsRepository.findByCpf(data.cpf)
      if (cpfExists) {
        throw new AppError('CPF já cadastrado', 400)
      }
    }

    return this.patientsRepository.create(data as any)
  }

  async executeFindById(id: string): Promise<Patient | null> {
    const patient = await this.patientsRepository.findWithDetails(id)
    if (!patient) {
      throw new AppError('Paciente não encontrado', 404)
    }
    return patient
  }

  async executeUpdate(id: string, data: Prisma.PatientUpdateInput): Promise<Patient> {
    const patient = await this.patientsRepository.findById(id)
    if (!patient) {
      throw new AppError('Paciente não encontrado', 404)
    }
    return this.patientsRepository.update(id, data)
  }
}
