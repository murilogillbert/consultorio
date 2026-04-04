import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

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

// Public: active openings
export function useActiveJobOpenings() {
  return useQuery({
    queryKey: ['jobs', 'active'],
    queryFn: async () => {
      const { data } = await api.get<JobOpening[]>('/hr/openings/active')
      return data
    }
  })
}

// Admin: all openings
export function useJobOpenings() {
  return useQuery({
    queryKey: ['jobs', 'all'],
    queryFn: async () => {
      const { data } = await api.get<JobOpening[]>('/hr/openings')
      return data
    }
  })
}

export function useJobOpening(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { data } = await api.get<JobOpening>(`/hr/openings/${id}`)
      return data
    },
    enabled: !!id
  })
}

export function useCreateJobOpening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<JobOpening> & { clinicId: string }) => {
      const { data: result } = await api.post('/hr/openings', data)
      return result
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] })
  })
}

export function useUpdateJobOpening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { data: result } = await api.put(`/hr/openings/${id}`, data)
      return result
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] })
  })
}

export function useDeleteJobOpening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/openings/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] })
  })
}

// Public: submit candidacy
export function useSubmitCandidacy() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string; message?: string; resumeUrl?: string; jobOpeningId?: string }) => {
      const { data: result } = await api.post('/hr/candidacies', data)
      return result
    }
  })
}

// Admin: candidacies for a job
export function useJobCandidacies(jobId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', jobId, 'candidacies'],
    queryFn: async () => {
      const { data } = await api.get<JobCandidacy[]>(`/hr/openings/${jobId}/candidacies`)
      return data
    },
    enabled: !!jobId
  })
}
