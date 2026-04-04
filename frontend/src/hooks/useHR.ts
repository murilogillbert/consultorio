import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface JobCandidacy {
  id: string
  jobOpeningId?: string
  name: string
  email: string
  phone?: string
  message?: string
  resumeUrl?: string
  status: 'PENDING' | 'REVIEWED' | 'INTERVIEWED' | 'HIRED' | 'REJECTED'
  reviewedAt?: string
  createdAt: string
  jobOpening?: {
    title: string
  }
}

export function useCandidacies(jobId?: string) {
  return useQuery({
    queryKey: ['candidacies', jobId],
    queryFn: async () => {
      const url = jobId ? `/hr/candidacies/${jobId}` : '/hr/candidacies/all'
      const { data } = await api.get<JobCandidacy[]>(url)
      return data
    },
    enabled: !!jobId || true // Can be used for all candidacies if admin
  })
}

export function useCreateCandidacy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (candidacyData: Partial<JobCandidacy>) => {
      const { data } = await api.post('/hr/candidacies', candidacyData)
      return data
    },
    onSuccess: (_, variables) => {
      if (variables.jobOpeningId) {
        queryClient.invalidateQueries({ queryKey: ['candidacies', variables.jobOpeningId] })
      }
      queryClient.invalidateQueries({ queryKey: ['candidacies'] })
    }
  })
}

export function useUpdateCandidacyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data } = await api.patch(`/hr/candidacies/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidacies'] })
    }
  })
}
