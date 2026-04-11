import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend JobOpeningResponseDto:
// { id, title, description, requirements, status, postedDate, closingDate, isActive, createdAt, candidacyCount }
interface JobOpeningRaw {
  id: string
  title: string
  description?: string
  requirements?: string
  status: string
  postedDate: string
  closingDate?: string
  isActive: boolean
  createdAt: string
  candidacyCount: number
}

export interface JobOpening {
  id: string
  clinicId: string
  title: string
  area?: string
  regime?: string
  location?: string
  hours?: string
  requirements?: string
  responsibilities?: string
  benefits?: string
  active: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
  candidacies?: JobCandidacy[]
  _count?: { candidacies?: number }
}

export interface JobCandidacy {
  id: string
  jobOpeningId?: string
  name: string
  email: string
  phone?: string
  message?: string
  resumeUrl?: string
  status: string
  createdAt: string
}

function mapJob(j: JobOpeningRaw): JobOpening {
  return {
    id: j.id,
    clinicId: '',
    title: j.title,
    responsibilities: j.description,
    requirements: j.requirements,
    active: j.isActive && j.status === 'OPEN',
    expiresAt: j.closingDate,
    createdAt: j.createdAt,
    updatedAt: j.createdAt,
    _count: { candidacies: j.candidacyCount },
  }
}

// Public: active openings
export function useActiveJobOpenings() {
  return useQuery({
    queryKey: ['jobs', 'active'],
    queryFn: async () => {
      const { data } = await api.get<JobOpeningRaw[]>('/jobs?openOnly=true')
      return data.map(mapJob)
    }
  })
}

// Admin: all openings
export function useJobOpenings() {
  return useQuery({
    queryKey: ['jobs', 'all'],
    queryFn: async () => {
      const { data } = await api.get<JobOpeningRaw[]>('/jobs')
      return data.map(mapJob)
    }
  })
}

export function useJobOpening(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { data } = await api.get<JobOpeningRaw>(`/jobs/${id}`)
      return mapJob(data)
    },
    enabled: !!id
  })
}

export function useCreateJobOpening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<JobOpening> & { clinicId?: string }) => {
      const payload = {
        title: data.title,
        description: data.responsibilities,
        requirements: data.requirements,
        closingDate: data.expiresAt,
      }
      const { data: result } = await api.post<JobOpeningRaw>('/jobs', payload)
      return mapJob(result)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] })
  })
}

export function useUpdateJobOpening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const payload: any = {}
      if (data.title !== undefined) payload.title = data.title
      if (data.responsibilities !== undefined) payload.description = data.responsibilities
      if (data.requirements !== undefined) payload.requirements = data.requirements
      if (data.expiresAt !== undefined) payload.closingDate = data.expiresAt
      if (data.active !== undefined) payload.isActive = data.active
      const { data: result } = await api.put<JobOpeningRaw>(`/jobs/${id}`, payload)
      return mapJob(result)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] })
  })
}

export function useDeleteJobOpening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/jobs/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] })
  })
}

// Public: submit candidacy — backend expects jobOpeningId + candidate* fields
export function useSubmitCandidacy() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string; message?: string; resumeUrl?: string; jobOpeningId?: string }) => {
      const payload = {
        jobOpeningId: data.jobOpeningId,
        candidateName: data.name,
        candidateEmail: data.email,
        candidatePhone: data.phone,
        resumeUrl: data.resumeUrl,
        notes: data.message,
      }
      const { data: result } = await api.post('/candidacies', payload)
      return result
    }
  })
}

// Admin: candidacies for a job
export function useJobCandidacies(jobId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', jobId, 'candidacies'],
    queryFn: async () => {
      const { data } = await api.get<any[]>(`/candidacies?jobId=${jobId}`)
      return data
    },
    enabled: !!jobId
  })
}
