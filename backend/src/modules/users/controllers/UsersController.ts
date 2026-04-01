import { Request, Response, NextFunction } from 'express'
import { UsersService } from '../services/UsersService'
import { UsersRepository } from '../repositories/UsersRepository'

export class UsersController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, role, phone } = req.body

      const usersRepository = new UsersRepository()
      const usersService = new UsersService(usersRepository)

      const result = await usersService.executeCreate({
        name,
        email,
        passwordHash: password, // Raw password
        role,
        phone,
      })

      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const usersRepository = new UsersRepository()
      const usersService = new UsersService(usersRepository)

      const result = await usersService.executeList()

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }

      const usersRepository = new UsersRepository()
      const usersService = new UsersService(usersRepository)

      const result = await usersService.executeFindById(id)

      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}
