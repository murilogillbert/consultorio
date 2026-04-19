import { StorageProvider } from './storageProvider'
import fs from 'fs/promises'
import path from 'path'

const UPLOADS_DIR = path.resolve('uploads')

export class LocalStorageProvider implements StorageProvider {
  async upload({ buffer, filename }: { buffer: Buffer; filename: string; mimetype: string }): Promise<string> {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
    const dest = path.join(UPLOADS_DIR, filename)
    await fs.writeFile(dest, buffer)
    return `/uploads/${filename}`
  }

  async delete(fileUrl: string): Promise<void> {
    const filename = path.basename(fileUrl)
    const dest = path.join(UPLOADS_DIR, filename)
    await fs.unlink(dest).catch(() => {})
  }
}
