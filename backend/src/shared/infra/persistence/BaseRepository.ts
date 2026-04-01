import { prisma } from '../../../config/database'

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(protected model: any) {}

  async create(data: CreateInput): Promise<T> {
    return this.model.create({ data })
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
    })
  }

  async list(filterActive = true): Promise<T[]> {
    const where = filterActive ? { active: true } : {}
    return this.model.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    })
  }

  async delete(id: string, physical = false): Promise<T | void> {
    if (physical) {
      return this.model.delete({ where: { id } })
    }
    // Logic delete if active field exists
    return this.model.update({
      where: { id },
      data: { active: false },
    })
  }
}
