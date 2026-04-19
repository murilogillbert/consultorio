export interface StorageProvider {
  upload(params: { buffer: Buffer; filename: string; mimetype: string }): Promise<string>
  delete(fileUrl: string): Promise<void>
}
