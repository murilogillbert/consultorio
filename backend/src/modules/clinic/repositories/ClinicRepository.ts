import { prisma } from '../../../config/database'
import { Clinic, Prisma, ClinicUnit, WorkingHour, SystemUser } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class ClinicRepository extends BaseRepository<Clinic, Prisma.ClinicCreateInput, Prisma.ClinicUpdateInput> {
  constructor() {
    super(prisma.clinic)
  }

  async findWithDetails(id: string): Promise<Clinic | null> {
    return prisma.clinic.findUnique({
      where: { id },
      include: {
        units: true,
        workingHours: true,
        integrationSettings: true,
      },
    })
  }
}

export class ClinicUnitRepository extends BaseRepository<ClinicUnit, Prisma.ClinicUnitCreateInput, Prisma.ClinicUnitUpdateInput> {
  constructor() {
    super(prisma.clinicUnit)
  }

  async findByClinic(clinicId: string): Promise<ClinicUnit[]> {
    return prisma.clinicUnit.findMany({
      where: { clinicId, active: true },
    })
  }
}

export class WorkingHourRepository extends BaseRepository<WorkingHour, Prisma.WorkingHourCreateInput, Prisma.WorkingHourUpdateInput> {
  constructor() {
    super(prisma.workingHour)
  }

  async findByClinic(clinicId: string): Promise<WorkingHour[]> {
    return prisma.workingHour.findMany({
      where: { clinicId },
      orderBy: { dayOfWeek: 'asc' },
    })
  }
}

export class SystemUserRepository extends BaseRepository<SystemUser, Prisma.SystemUserCreateInput, Prisma.SystemUserUpdateInput> {
  constructor() {
    super(prisma.systemUser)
  }

  async findByClinicAndUser(clinicId: string, userId: string): Promise<SystemUser | null> {
    return prisma.systemUser.findUnique({
      where: {
        clinicId_userId: { clinicId, userId },
      },
      include: { user: true },
    })
  }
}
