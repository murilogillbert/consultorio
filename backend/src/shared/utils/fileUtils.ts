import path from 'path'

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase()
}

export function isImage(filename: string): boolean {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(getFileExtension(filename))
}

export function isDocument(filename: string): boolean {
  return ['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(getFileExtension(filename))
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}
