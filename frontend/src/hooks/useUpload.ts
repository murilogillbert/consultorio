import { useState } from 'react'
import { api } from '../services/api'

interface UploadResult {
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
}

export function useUpload() {
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File): Promise<UploadResult> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post<UploadResult>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    } finally {
      setUploading(false)
    }
  }

  const uploadMultiple = async (files: File[]): Promise<UploadResult[]> => {
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const { data } = await api.post<UploadResult[]>('/uploads/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    } finally {
      setUploading(false)
    }
  }

  return { uploadFile, uploadMultiple, uploading }
}
