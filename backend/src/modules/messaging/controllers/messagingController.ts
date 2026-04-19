import { Request, Response, NextFunction } from 'express'
import { getConversationService } from '../services/getConversationService'
import { resolveConversationService } from '../services/resolveConversationService'
import { transferConversationService } from '../services/transferConversationService'
import { addInternalNoteService } from '../services/addInternalNoteService'
import { linkPatientToConversationService } from '../services/linkPatientToConversationService'

export class MessagingController {
  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await getConversationService(req.params.id)
      res.json(result)
    } catch (err) { next(err) }
  }

  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await resolveConversationService(req.params.id)
      res.json(result)
    } catch (err) { next(err) }
  }

  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { assignedToId } = req.body
      const result = await transferConversationService(req.params.id, assignedToId)
      res.json(result)
    } catch (err) { next(err) }
  }

  async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body
      const result = await addInternalNoteService(req.params.id, req.user.id, content)
      res.status(201).json(result)
    } catch (err) { next(err) }
  }

  async linkPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = req.body
      const result = await linkPatientToConversationService(req.params.id, patientId)
      res.json(result)
    } catch (err) { next(err) }
  }
}
