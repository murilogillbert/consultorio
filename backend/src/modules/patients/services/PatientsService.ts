import { PatientsRepository, AppointmentsRepository } from '../repositories/PatientsRepository'
import { Patient, Prisma, Appointment } from '@prisma/client'
import { AppError } from '../../../shared/errors/AppError'
import { sendOtpEmail } from '../../../shared/services/emailService'
import jwt from 'jsonwebtoken'
import { env } from '../../../config/env'
import { prisma } from '../../../config/database'
import bcrypt from 'bcrypt'

const DEFAULT_PASSWORD = '123456'

export class PatientsService {
  private patientsRepository: PatientsRepository
  private appointmentsRepository: AppointmentsRepository

  constructor(patientsRepository: PatientsRepository) {
    this.patientsRepository = patientsRepository
    this.appointmentsRepository = new AppointmentsRepository()
  }

  async executeList(): Promise<Patient[]> {
    return this.patientsRepository.listAll()
  }

  async executeSearch(query: string): Promise<Patient[]> {
    return this.patientsRepository.search(query)
  }

  async executeCreate(data: any): Promise<Patient & { generatedPassword?: string }> {
    const { name, email, notes, ...patientData } = data

    // If no userId is provided but name+email are given, create a new User.
    // Each person gets their own User account — multiple people may share the same email
    // (e.g. a dependent using the responsible's email).
    if (!patientData.userId && name && email) {
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
      const newUser = await prisma.user.create({
        data: { name, email, passwordHash, role: 'PATIENT' },
      })
      patientData.userId = newUser.id
      patientData._generatedPassword = DEFAULT_PASSWORD
    }

    if (!patientData.userId) {
      throw new AppError('userId, ou name+email são obrigatórios', 400)
    }

    const patientExists = await this.patientsRepository.findByUserId(patientData.userId)
    if (patientExists) {
      throw new AppError('Este usuário já tem um perfil de paciente', 400)
    }

    if (patientData.cpf) {
      const cpfExists = await this.patientsRepository.findByCpf(patientData.cpf)
      if (cpfExists) {
        throw new AppError('CPF já cadastrado', 400)
      }
    }

    const generatedPassword = patientData._generatedPassword
    delete patientData._generatedPassword

    const patient = await this.patientsRepository.create({ ...patientData, notes } as any)
    return Object.assign(patient, { generatedPassword })
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

  async requestOtp(email: string): Promise<void> {
    const patient = await this.patientsRepository.findByUserEmail(email)
    if (!patient) {
      throw new AppError('E-mail não vinculado a nenhum paciente cadastrado.', 404)
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await this.patientsRepository.updateOtp((patient as any).user.id, otp, expiresAt)
    await sendOtpEmail(email, (patient as any).user.name, otp)
  }

  async verifyOtp(email: string, code: string): Promise<{ token: string; patient: any }> {
    const patient = await this.patientsRepository.findByUserEmail(email)
    if (!patient || !(patient as any).user) {
      throw new AppError('Paciente não encontrado.', 404)
    }

    const user = (patient as any).user
    if (!user.otpCode || user.otpCode !== code) {
      throw new AppError('Código inválido.', 400)
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      throw new AppError('Código expirado.', 400)
    }

    await this.patientsRepository.updateOtp(user.id, '', new Date(0))

    const token = jwt.sign(
      { sub: user.id, role: 'PATIENT_PORTAL' },
      env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    )

    return { token, patient }
  }

  async getMyAppointments(patientId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.findByPatient(patientId)
  }
}
