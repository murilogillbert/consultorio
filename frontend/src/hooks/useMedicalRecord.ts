import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// ─── Tipos espelhando os DTOs em backend/Consultorio.API/DTOs/MedicalRecordDtos.cs ───

export interface MedicalRecord {
  id: string
  patientId: string
  patientName: string
  bloodType?: string | null
  allergies?: string | null
  chronicConditions?: string | null
  currentMedications?: string | null
  familyHistory?: string | null
  surgicalHistory?: string | null
  habits?: string | null
  heightCm?: number | null
  weightKg?: number | null
  createdAt: string
  updatedAt?: string | null
  updatedByName?: string | null
  isRestrictedView: boolean
}

export interface SessionNote {
  id: string
  appointmentId: string
  patientId: string
  professionalId: string
  professionalName: string
  serviceName: string
  appointmentStartTime: string
  appointmentStatus: string
  chiefComplaint?: string | null
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  diagnosis?: string | null
  diagnosisCode?: string | null
  prescription?: string | null
  vitalSignsJson?: string | null
  isSigned: boolean
  signedAt?: string | null
  createdAt: string
  updatedAt?: string | null
  isRestrictedView: boolean
}

export interface MedicalAttachment {
  id: string
  patientId: string
  sessionNoteId?: string | null
  fileName: string
  originalName: string
  mimeType: string
  size: number
  url: string
  category: string
  description?: string | null
  uploadedById: string
  uploadedByName: string
  uploadedAt: string
}

export type AttachmentCategory =
  | 'EXAM' | 'IMAGE' | 'REPORT' | 'PRESCRIPTION' | 'RECEIPT' | 'CERTIFICATE' | 'OTHER'

export interface UpdateMedicalRecordPayload {
  bloodType?: string | null
  allergies?: string | null
  chronicConditions?: string | null
  currentMedications?: string | null
  familyHistory?: string | null
  surgicalHistory?: string | null
  habits?: string | null
  heightCm?: number | null
  weightKg?: number | null
}

export interface UpsertSessionNotePayload {
  chiefComplaint?: string | null
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  diagnosis?: string | null
  diagnosisCode?: string | null
  prescription?: string | null
  vitalSignsJson?: string | null
}

// ─── Medical record ────────────────────────────────────────────────────────

export function useMedicalRecord(patientId: string | undefined) {
  return useQuery({
    queryKey: ['medical-record', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await api.get<MedicalRecord>(`/patients/${patientId}/medical-record`)
      return data
    },
  })
}

export function useUpdateMedicalRecord(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateMedicalRecordPayload) => {
      const { data } = await api.put<MedicalRecord>(`/patients/${patientId}/medical-record`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-record', patientId] })
    },
  })
}

// ─── Session notes (lista por paciente) ────────────────────────────────────

export function useSessionNotes(patientId: string | undefined) {
  return useQuery({
    queryKey: ['session-notes', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await api.get<SessionNote[]>(`/patients/${patientId}/session-notes`)
      return data
    },
  })
}

// ─── Session note por appointment (lazy: cria-se ao salvar) ───────────────

export function useSessionNoteByAppointment(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['session-note-by-appointment', appointmentId],
    enabled: !!appointmentId,
    queryFn: async () => {
      const { data } = await api.get<SessionNote>(`/appointments/${appointmentId}/session-note`)
      return data
    },
  })
}

export function useCreateSessionNote(appointmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpsertSessionNotePayload) => {
      const { data } = await api.post<SessionNote>(`/appointments/${appointmentId}/session-note`, payload)
      return data
    },
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: ['session-note-by-appointment', appointmentId] })
      qc.invalidateQueries({ queryKey: ['session-notes', data.patientId] })
    },
  })
}

export function useUpdateSessionNote(noteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpsertSessionNotePayload) => {
      const { data } = await api.put<SessionNote>(`/session-notes/${noteId}`, payload)
      return data
    },
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: ['session-note-by-appointment', data.appointmentId] })
      qc.invalidateQueries({ queryKey: ['session-notes', data.patientId] })
    },
  })
}

export function useSignSessionNote(noteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SessionNote>(`/session-notes/${noteId}/sign`)
      return data
    },
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: ['session-note-by-appointment', data.appointmentId] })
      qc.invalidateQueries({ queryKey: ['session-notes', data.patientId] })
      // Status do appointment muda para COMPLETED — invalida agenda.
      qc.invalidateQueries({ queryKey: ['professional-agenda'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

// ─── Attachments ───────────────────────────────────────────────────────────

export function useMedicalAttachments(patientId: string | undefined) {
  return useQuery({
    queryKey: ['medical-attachments', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await api.get<MedicalAttachment[]>(`/patients/${patientId}/medical-attachments`)
      return data
    },
  })
}

export function useUploadMedicalAttachment(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      file, category, sessionNoteId, description,
    }: {
      file: File; category: AttachmentCategory; sessionNoteId?: string; description?: string
    }) => {
      const form = new FormData()
      form.append('file', file)
      const params = new URLSearchParams({ category })
      if (sessionNoteId) params.append('sessionNoteId', sessionNoteId)
      if (description) params.append('description', description)
      const { data } = await api.post<MedicalAttachment>(
        `/patients/${patientId}/medical-attachments?${params.toString()}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-attachments', patientId] })
    },
  })
}

export function useDeleteMedicalAttachment(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/medical-attachments/${attachmentId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-attachments', patientId] })
    },
  })
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export const ATTACHMENT_CATEGORIES: { value: AttachmentCategory; label: string }[] = [
  { value: 'EXAM', label: 'Exame' },
  { value: 'IMAGE', label: 'Imagem' },
  { value: 'REPORT', label: 'Laudo' },
  { value: 'PRESCRIPTION', label: 'Receita' },
  { value: 'RECEIPT', label: 'Recibo' },
  { value: 'CERTIFICATE', label: 'Atestado' },
  { value: 'OTHER', label: 'Outro' },
]

export function attachmentAbsoluteUrl(att: MedicalAttachment): string {
  // O backend devolve URLs relativas tipo "/uploads/medical/{patientId}/{file}".
  // O frontend conversa com `${api.baseURL}` que termina em "/api"; precisamos
  // tirar o sufixo /api para resolver static files servidos pelo ASP.NET.
  const base = (import.meta.env.VITE_API_URL as string | undefined)
    ?? (import.meta.env.PROD ? 'https://api.psicologiaeexistir.com.br/api' : 'http://localhost:3333/api')
  const root = base.replace(/\/api\/?$/, '')
  return `${root}${att.url}`
}
