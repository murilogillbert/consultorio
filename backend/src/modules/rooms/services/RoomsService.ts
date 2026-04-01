import { RoomsRepository } from '../repositories/roomsRepository'
import { Room, Prisma } from '@prisma/client'
import { AppError } from '../../../shared/errors/AppError'

export class RoomsService {
  private roomsRepository: RoomsRepository

  constructor(roomsRepository: RoomsRepository) {
    this.roomsRepository = roomsRepository
  }

  async executeList(clinicId?: string): Promise<Room[]> {
    if (clinicId) {
      return this.roomsRepository.findByClinic(clinicId)
    }
    return this.roomsRepository.list()
  }

  async executeGet(id: string): Promise<Room | null> {
    const room = await this.roomsRepository.findWithEquipments(id)
    if (!room) {
      throw new AppError('Sala não encontrada', 404)
    }
    return room
  }

  async executeCreate(data: Prisma.RoomUncheckedCreateInput): Promise<Room> {
    return this.roomsRepository.create(data as any)
  }

  async executeUpdate(id: string, data: Prisma.RoomUpdateInput): Promise<Room> {
    const room = await this.roomsRepository.findById(id)
    if (!room) {
      throw new AppError('Sala não encontrada', 404)
    }
    return this.roomsRepository.update(id, data)
  }

  async executeDelete(id: string): Promise<Room | void> {
    const room = await this.roomsRepository.findById(id)
    if (!room) {
      throw new AppError('Sala não encontrada', 404)
    }
    return this.roomsRepository.delete(id)
  }
}
