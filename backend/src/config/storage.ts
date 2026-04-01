import multer from 'multer'
import crypto from 'crypto'
import path from 'path'

const tmpFolder = path.resolve(__dirname, '..', '..', 'uploads')

export const storageConfig = {
  directory: tmpFolder,
  multer: multer.diskStorage({
    destination: tmpFolder,
    filename(request, file, callback) {
      const fileHash = crypto.randomBytes(16).toString('hex')
      const fileName = `${fileHash}-${file.originalname}`

      return callback(null, fileName)
    },
  }),
}
