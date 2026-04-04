import { Request, Response, NextFunction } from 'express'
import { SliderBannerRepository } from '../repositories/SliderBannerRepository'

const bannerRepo = new SliderBannerRepository()

export class BannerController {
  async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { clinicId } = req.params as { clinicId: string }
      const banners = await bannerRepo.findActiveByClinic(clinicId)
      res.json(banners)
    } catch (err) { next(err) }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const banners = await bannerRepo.list(false)
      res.json(banners)
    } catch (err) { next(err) }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, subtitle, imageUrl, videoUrl, ctaLabel, ctaUrl, order, active, expiresAt, clinicId } = req.body
      const banner = await bannerRepo.create({
        title,
        subtitle,
        imageUrl,
        videoUrl,
        ctaLabel,
        ctaUrl,
        order: order || 0,
        active: active !== undefined ? active : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        clinic: { connect: { id: clinicId } }
      })
      res.status(201).json(banner)
    } catch (err) { next(err) }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      const data = { ...req.body }
      if (data.expiresAt) data.expiresAt = new Date(data.expiresAt)
      
      const banner = await bannerRepo.update(id, data)
      res.json(banner)
    } catch (err) { next(err) }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string }
      await bannerRepo.delete(id)
      res.json({ ok: true })
    } catch (err) { next(err) }
  }
}
