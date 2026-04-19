import { Request, Response, NextFunction } from 'express'
import { createCampaignService } from '../services/createCampaignService'
import { getCampaignRoiService } from '../services/getCampaignRoiService'
import { exportSegmentedListService } from '../services/exportSegmentedListService'
import { getFirstString, requireSingleString } from '../../../shared/utils/requestUtils'

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
      const id = requireSingleString(req.params.id, 'id')
      const result = await getCampaignRoiService(id)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }

  async exportSegment(req: Request, res: Response, next: NextFunction) {
    try {
      const segment = getFirstString(req.query.segment) ?? 'all'
      const csv = await exportSegmentedListService(segment)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="segment_${segment}.csv"`)
      res.send(csv)
    } catch (err) {
      next(err)
    }
  }
}
