import { Router, Request, Response, NextFunction } from 'express'
import { upload } from '../shared/middlewares/uploadMiddleware'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()

// Single file upload — returns the URL
r.post(
  '/',
  ensureAuthenticated,
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' })
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`

      res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      })
    } catch (err) {
      next(err)
    }
  }
)

// Multiple files upload — returns array of URLs
r.post(
  '/multiple',
  ensureAuthenticated,
  upload.array('files', 10),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[]
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' })
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`
      const uploaded = files.map(f => ({
        fileUrl: `${baseUrl}/uploads/${f.filename}`,
        fileName: f.originalname,
        fileType: f.mimetype,
        fileSize: f.size,
      }))

      res.json(uploaded)
    } catch (err) {
      next(err)
    }
  }
)

export default r
