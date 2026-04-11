import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend ProfessionalResponseDto:
// { id, userId, name, email, phone, avatarUrl, licenseNumber, specialty, bio, isAvailable, createdAt, services: string[] }
interface ProfessionalResponseDtoRaw {
  id: string
  userId: string
  name: string
  email: string
  phone?: string
  avatarUrl?: string
  licenseNumber: string
  specialty?: string
  bio?: string
  isAvailable: boolean
  createdAt: string
  services: string[]
}

// Shape expected by UI
export interface Professional {
  id: string
  userId: string
  crm: string
  councilType: string
  specialty: string
  bio?: string
  languages?: string
  active: boolean
  user?: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
  services?: Array<{ service: { id: string; name: string } }>
  schedules?: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>
  educations?: Array<{ id: string; institution: string; degree: string; fieldOfStudy: string; year: number }>
  certifications?: Array<{ id: string; name: string; institution: string; year: number }>
}

function mapProfessional(raw: ProfessionalResponseDtoRaw): Professional {
  return {
    id: raw.id,
    userId: raw.userId,
    crm: raw.licenseNumber,
    councilType: 'CRM',
    specialty: raw.specialty || '',
    bio: raw.bio,
    languages: '',
    active: raw.isAvailable,
    user: {
      id: raw.userId,
      name: raw.name,
      email: raw.email,
      avatarUrl: raw.avatarUrl,
    },
    services: (raw.services || []).map(s => ({ service: { id: s, name: s } })),
    schedules: [],
  }
}

export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data } = await api.get<ProfessionalResponseDtoRaw[]>('/professionals')
      return data.map(mapProfessional)
    }
  })
}

export function useProfessional(id: string | undefined) {
  return useQuery({
    queryKey: ['professionals', id],
    queryFn: async () => {
      const { data } = await api.get<ProfessionalResponseDtoRaw>(`/professionals/${id}`)
      return mapProfessional(data)
    },
    enabled: !!id
  })
}

export function useCreateProfessional() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId?: string
      name?: string
      email?: string
      password?: string
      phone?: string
      crm: string
      councilType?: string
      specialty?: string
      bio?: string
      languages?: string
      schedules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
    }) => {
      // Backend requires name/email/password — create a user and professional in one call
      const payload = {
        name: input.name || 'Novo Profissional',
        email: input.email || `prof_${Date.now()}@example.com`,
        password: input.password || 'ChangeMe@123',
        phone: input.phone,
        licenseNumber: input.crm,
        specialty: input.specialty,
        bio: input.bio,
      }
      const { data } = await api.post<ProfessionalResponseDtoRaw>('/professionals', payload)
      return mapProfessional(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals'] })
  })
}

export function useUpdateProfessional() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; [key: string]: any }) => {
      const payload: any = {}
      if (updateData.name !== undefined) payload.name = updateData.name
      if (updateData.phone !== undefined) payload.phone = updateData.phone
      if (updateData.avatarUrl !== undefined) payload.avatarUrl = updateData.avatarUrl
      if (updateData.crm !== undefined) payload.licenseNumber = updateData.crm
      if (updateData.specialty !== undefined) payload.specialty = updateData.specialty
      if (updateData.bio !== undefined) payload.bio = updateData.bio
      if (updateData.active !== undefined) payload.isAvailable = updateData.active
      const { data } = await api.put<ProfessionalResponseDtoRaw>(`/professionals/${id}`, payload)
      return mapProfessional(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals'] })
  })
}
