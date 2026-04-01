import { prisma } from '../../../config/database'
import { Equipment, Prisma, EquipmentUsage, ServiceEquipment } from '@prisma/client'
import { BaseRepository } from '../../../shared/infra/persistence/BaseRepository'

export class EquipmentRepository extends BaseRepository<Equipment, Prisma.EquipmentCreateInput, Prisma.EquipmentUpdateInput> {
  constructor() {
    super(prisma.equipment)
  }

  async findWithDetails(id: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({
      where: { id },
      include: {
        clinic: true,
        defaultRoom: true,
        currentRoom: true,
        usages: { take: 5, orderBy: { startsAt: 'desc' } }
      }
    })
  }

  async listByClinic(clinicId: string): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    })
  }
}

export class EquipmentUsageRepository extends BaseRepository<EquipmentUsage, Prisma.EquipmentUsageCreateInput, Prisma.EquipmentUsageUpdateInput> {
  constructor() {
    super(prisma.equipmentUsage)
  }

  async findConflicts(equipmentId: string, start: Date, end: Date): Promise<EquipmentUsage[]> {
    return prisma.equipmentUsage.findMany({
      where: {
        equipmentId,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        OR: [
          { startsAt: { lt: end }, endsAt: { gt: start } }
        ]
      }
    })
  }
}

export class ServiceEquipmentRepository extends BaseRepository<ServiceEquipment, Prisma.ServiceEquipmentCreateInput, Prisma.ServiceEquipmentUpdateInput> {
  constructor() {
    super(prisma.serviceEquipment)
  }

  async findByService(serviceId: string): Promise<ServiceEquipment[]> {
    return prisma.serviceEquipment.findMany({
      where: { serviceId },
      include: { equipment: true }
    })
  }
}
