import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend ProfessionalResponseDto:
// { id, userId, name, email, phone, avatarUrl, licenseNumber, specialty, bio, isAvailable, createdAt, services: string[], serviceIds: string[] }
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
  serviceIds: string[]
  commissionPct: number
  schedules: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>
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
  commissionPct: number
  // IDs dos serviços vinculados — para filtrar profissionais por serviço no agendamento
  serviceIds?: string[]
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
    commissionPct: raw.commissionPct ?? 50,
    user: {
      id: raw.userId,
      name: raw.name,
      email: raw.email,
      avatarUrl: raw.avatarUrl,
    },
    serviceIds: raw.serviceIds || [],
    services: (raw.services || []).map((name, i) => ({
      service: { id: (raw.serviceIds || [])[i] || name, name }
    })),
    schedules: (raw.schedules || []).map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  }
}

export function useProfessionals(serviceId?: string) {
  return useQuery({
    queryKey: ['professionals', { serviceId: serviceId || null }],
    queryFn: async () => {
      const { data } = await api.get<ProfessionalResponseDtoRaw[]>('/professionals', {
        params: serviceId ? { serviceId } : undefined,
      })
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
      commissionPct?: number
      schedules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
    }) => {
      // Backend requires name/email/password — create a user and professional in one call
      const payload: any = {
        name: input.name || 'Novo Profissional',
        email: input.email || `prof_${Date.now()}@example.com`,
        password: input.password || 'ChangeMe@123',
        phone: input.phone,
        licenseNumber: input.crm,
        specialty: input.specialty,
        bio: input.bio,
      }
      if (input.commissionPct !== undefined) payload.commissionPct = input.commissionPct
      const { data } = await api.post<ProfessionalResponseDtoRaw>('/professionals', payload)
      // Persist schedules (if provided) via POST /api/schedules
      if (input.schedules && input.schedules.length > 0) {
        await api.post('/schedules', {
          professionalId: data.id,
          slots: input.schedules,
        })
      }
      return mapProfessional(data)
    },
    onSuccess: (_data, _vars) => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    }
  })
}

export interface DeleteProfessionalResult {
  mode: 'soft' | 'hard'
  message?: string
}

export function useDeleteProfessional() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<DeleteProfessionalResult> => {
      const { data } = await api.delete<DeleteProfessionalResult>(`/professionals/${id}`)
      return data
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
      if (updateData.commissionPct !== undefined) payload.commissionPct = updateData.commissionPct
      const { data } = await api.put<ProfessionalResponseDtoRaw>(`/professionals/${id}`, payload)
      // Persist schedules separately. Always overwrite when caller passed a
      // schedules array — SetSchedule deletes all existing and rewrites, so
      // an empty array clears the grid intentionally.
      if (Array.isArray(updateData.schedules)) {
        await api.post('/schedules', {
          professionalId: id,
          slots: updateData.schedules,
        })
      }
      return mapProfessional(data)
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['schedules', vars.id] })
    }
  })
}
