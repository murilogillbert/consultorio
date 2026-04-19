import { StorageProvider } from './storageProvider'

export class S3StorageProvider implements StorageProvider {
  async upload({ buffer, filename, mimetype }: { buffer: Buffer; filename: string; mimetype: string }): Promise<string> {
    // TODO: implement with @aws-sdk/client-s3
    console.warn('[S3] Provider not implemented — file not uploaded:', filename)
    return `/uploads/${filename}`
  }

  async delete(fileUrl: string): Promise<void> {
    console.warn('[S3] Provider not implemented — file not deleted:', fileUrl)
  }
}
