import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend CandidacyResponseDto:
// { id, jobOpeningId, candidateName, candidateEmail, candidatePhone, resumeUrl, status, notes, submissionDate }
interface CandidacyRaw {
  id: string
  jobOpeningId: string
  candidateName: string
  candidateEmail: string
  candidatePhone?: string
  resumeUrl?: string
  status: string
  notes?: string
  submissionDate: string
}

export interface JobCandidacy {
  id: string
  jobOpeningId?: string
  name: string
  email: string
  phone?: string
  message?: string
  resumeUrl?: string
  status: 'PENDING' | 'REVIEWED' | 'INTERVIEWED' | 'HIRED' | 'REJECTED' | string
  reviewedAt?: string
  createdAt: string
  jobOpening?: {
    title: string
  }
}

function mapCandidacy(c: CandidacyRaw): JobCandidacy {
  return {
    id: c.id,
    jobOpeningId: c.jobOpeningId,
    name: c.candidateName,
    email: c.candidateEmail,
    phone: c.candidatePhone,
    resumeUrl: c.resumeUrl,
    message: c.notes,
    status: c.status,
    createdAt: c.submissionDate,
  }
}

export function useCandidacies(jobId?: string) {
  return useQuery({
    queryKey: ['candidacies', jobId],
    queryFn: async () => {
      const url = jobId ? `/candidacies?jobId=${jobId}` : '/candidacies'
      const { data } = await api.get<CandidacyRaw[]>(url)
      return data.map(mapCandidacy)
    }
  })
}

export function useCreateCandidacy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (candidacyData: Partial<JobCandidacy>) => {
      const payload = {
        jobOpeningId: candidacyData.jobOpeningId,
        candidateName: candidacyData.name,
        candidateEmail: candidacyData.email,
        candidatePhone: candidacyData.phone,
        resumeUrl: candidacyData.resumeUrl,
        notes: candidacyData.message,
      }
      const { data } = await api.post<CandidacyRaw>('/candidacies', payload)
      return mapCandidacy(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidacies'] })
    }
  })
}

export function useUpdateCandidacyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data } = await api.put<CandidacyRaw>(`/candidacies/${id}`, { status })
      return mapCandidacy(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidacies'] })
    }
  })
}
