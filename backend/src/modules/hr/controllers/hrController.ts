import { Request, Response, NextFunction } from 'express'
import { JobOpeningRepository, JobCandidacyRepository } from '../repositories/jobsRepository'

const openingRepo = new JobOpeningRepository()
const candidacyRepo = new JobCandidacyRepository()

export class HrController {
  async listOpenings(_req: Request, res: Response, next: NextFunction) {
    try {
      const list = await openingRepo.list(false)
      res.json(list)
    } catch (err) { next(err) }
  }

  async listActiveOpenings(_req: Request, res: Response, next: NextFunction) {
    try {
      const list = await openingRepo.listActive()
      res.json(list)
    } catch (err) { next(err) }
  }

  async showOpening(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const opening = await openingRepo.findWithCandidacies(id)
      if (!opening) return res.status(404).json({ message: 'Vaga não encontrada' })
      res.json(opening)
    } catch (err) { next(err) }
  }

  async createOpening(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, area, regime, location, hours, requirements, responsibilities, benefits, expiresAt, clinicId } = req.body
      const opening = await openingRepo.create({
        title,
        area,
        regime,
        location,
        hours,
        requirements,
        responsibilities,
        benefits,
        active: true,
        ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
        clinic: { connect: { id: clinicId } },
      })
      res.status(201).json(opening)
    } catch (err) { next(err) }
  }

  async updateOpening(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = req.body
      if (data.expiresAt) data.expiresAt = new Date(data.expiresAt)
      const opening = await openingRepo.update(id, data)
      res.json(opening)
    } catch (err) { next(err) }
  }

  async deleteOpening(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      await openingRepo.update(id, { active: false })
      res.json({ ok: true })
    } catch (err) { next(err) }
  }

  async listCandidacies(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params as { jobId: string }
      const list = await candidacyRepo.findByJob(jobId)
      res.json(list)
    } catch (err) { next(err) }
  }

  async createCandidacy(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, message, resumeUrl, jobOpeningId } = req.body
      if (!name || !email) return res.status(400).json({ message: 'Nome e email são obrigatórios' })
      const candidacy = await candidacyRepo.create({
        name,
        email,
        ...(phone ? { phone } : {}),
        ...(message ? { message } : {}),
        ...(resumeUrl ? { resumeUrl } : {}),
        ...(jobOpeningId ? { jobOpening: { connect: { id: jobOpeningId } } } : {}),
      })
      res.status(201).json(candidacy)
    } catch (err) { next(err) }
  }

  async updateCandidacyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const { status } = req.body
      const candidacy = await candidacyRepo.update(id, {
        status,
        reviewedBy: { connect: { id: req.user.id } },
        reviewedAt: new Date(),
      })
      res.json(candidacy)
    } catch (err) { next(err) }
  }
}
