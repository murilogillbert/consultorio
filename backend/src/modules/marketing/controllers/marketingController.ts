import { Request, Response, NextFunction } from 'express'
import { createCampaignService } from '../services/createCampaignService'
import { getCampaignRoiService } from '../services/getCampaignRoiService'
import { exportSegmentedListService } from '../services/exportSegmentedListService'

export class MarketingController {
  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const campaign = await createCampaignService(req.body)
      res.status(201).json(campaign)
    } catch (err) {
      next(err)
    }
  }

  async campaignRoi(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const result = await getCampaignRoiService(id)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async exportSegment(req: Request, res: Response, next: NextFunction) {
    try {
      const { segment = 'all' } = req.query as { segment?: string }
      const csv = await exportSegmentedListService(segment)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="patients-${segment}.csv"`)
      res.send(csv)
    } catch (err) {
      next(err)
    }
  }
}
