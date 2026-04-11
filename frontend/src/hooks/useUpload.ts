import { useState } from 'react'
import { api } from '../services/api'

interface UploadResult {
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
}

// Backend: POST /api/upload (singular) returning { url, fileName, originalName, size }
// Backend returns a relative URL like "/uploads/general/xxx.png". Since the frontend
// lives on a different host than the API, we must prefix with the API origin.
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')

function absolutize(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

export function useUpload() {
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File, folder?: string): Promise<UploadResult> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const url = folder ? `/upload?folder=${encodeURIComponent(folder)}` : '/upload'
      const { data } = await api.post<{ url: string; fileName: string; originalName: string; size: number }>(
        url,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return {
        fileUrl: absolutize(data.url),
        fileName: data.fileName,
        fileType: file.type,
        fileSize: data.size,
      }
    } finally {
      setUploading(false)
    }
  }

  const uploadMultiple = async (files: File[]): Promise<UploadResult[]> => {
    setUploading(true)
    try {
      const results: UploadResult[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const { data } = await api.post<{ url: string; fileName: string; originalName: string; size: number }>(
          '/upload',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        results.push({
          fileUrl: absolutize(data.url),
          fileName: data.fileName,
          fileType: file.type,
          fileSize: data.size,
        })
      }
      return results
    } finally {
      setUploading(false)
    }
  }

  return { uploadFile, uploadMultiple, uploading }
}
