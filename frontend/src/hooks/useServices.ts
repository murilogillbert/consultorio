import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend ServiceResponseDto shape
interface ServiceResponseDtoRaw {
  id: string
  name: string
  description?: string
  shortDescription?: string
  preparation?: string
  onlineBooking: boolean
  durationMinutes: number
  price: number
  category?: string
  requiresRoom: boolean
  defaultRoomId?: string
  color?: string
  isActive: boolean
  createdAt: string
  professionals: Array<{ id: string; name: string; avatarUrl?: string }>
  insurancePlans: Array<{ id: string; name: string }>
}

// Shape expected by the UI pages
export interface Service {
  id: string
  name: string
  description?: string
  shortDescription?: string
  preparation?: string
  category?: string
  duration: number
  price: number          // cents
  onlineBooking: boolean
  active: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
  professionals?: Array<{ professional: { id: string; user?: { name: string; avatarUrl?: string } } }>
  insurances?: Array<{ insurancePlan: { id: string; name: string } }>
}

function mapService(raw: ServiceResponseDtoRaw): Service {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    shortDescription: raw.shortDescription,
    preparation: raw.preparation,
    category: raw.category,
    duration: raw.durationMinutes,
    price: Math.round(Number(raw.price) * 100),
    onlineBooking: raw.onlineBooking ?? true,
    active: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.createdAt,
    professionals: (raw.professionals || []).map(p => ({
      professional: { id: p.id, user: { name: p.name, avatarUrl: p.avatarUrl } }
    })),
    insurances: (raw.insurancePlans || []).map(i => ({
      insurancePlan: { id: i.id, name: i.name }
    })),
  }
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get<ServiceResponseDtoRaw[]>('/services')
      return data.map(mapService)
    }
  })
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ['services', id],
    queryFn: async () => {
      const { data } = await api.get<ServiceResponseDtoRaw>(`/services/${id}`)
      return mapService(data)
    },
    enabled: !!id
  })
}

interface CreateServicePayload {
  name: string
  description?: string
  shortDescription?: string
  preparation?: string
  category?: string
  duration: number
  price: number
  onlineBooking?: boolean
  imageUrl?: string
  roomId?: string
  insuranceIds?: string[]
  professionalIds?: string[]
}

function toBackendCreate(p: CreateServicePayload) {
  return {
    name: p.name,
    description: p.description,
    shortDescription: p.shortDescription,
    preparation: p.preparation,
    onlineBooking: p.onlineBooking ?? true,
    durationMinutes: p.duration,
    price: (p.price || 0) / 100,
    category: p.category,
    requiresRoom: !!p.roomId,
    defaultRoomId: p.roomId || null,
    color: '#007BFF',
    professionalIds: p.professionalIds?.map(id => id) || [],
    insuranceIds: p.insuranceIds?.map(id => id) || [],
  }
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (serviceData: CreateServicePayload) => {
      const { data } = await api.post<ServiceResponseDtoRaw>('/services', toBackendCreate(serviceData))
      return mapService(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; [key: string]: any }) => {
      const payload: any = {}
      if (updateData.name !== undefined)             payload.name             = updateData.name
      if (updateData.description !== undefined)      payload.description      = updateData.description
      if (updateData.shortDescription !== undefined) payload.shortDescription = updateData.shortDescription
      if (updateData.preparation !== undefined)      payload.preparation      = updateData.preparation
      if (updateData.onlineBooking !== undefined)    payload.onlineBooking    = updateData.onlineBooking
      if (updateData.category !== undefined)         payload.category         = updateData.category
      if (updateData.duration !== undefined)         payload.durationMinutes  = updateData.duration
      if (updateData.price !== undefined)            payload.price            = updateData.price / 100
      if (updateData.roomId !== undefined) {
        payload.requiresRoom  = !!updateData.roomId
        payload.defaultRoomId = updateData.roomId || null
      }
      if (updateData.active !== undefined)           payload.isActive         = updateData.active
      if (updateData.professionalIds !== undefined)  payload.professionalIds  = updateData.professionalIds
      if (updateData.insuranceIds !== undefined)     payload.insuranceIds     = updateData.insuranceIds
      const { data } = await api.put<ServiceResponseDtoRaw>(`/services/${id}`, payload)
      return mapService(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  })
}

// Toggle active/inactive (soft deactivation)
export function useToggleServiceActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ServiceResponseDtoRaw>(`/services/${id}/toggle-active`)
      return mapService(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  })
}

// Hard delete — removes service permanently from the database.
// Backend returns 409 if the service has appointments.
export function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  })
}

/** @deprecated Use useToggleServiceActive instead */
export function useArchiveService() {
  return useToggleServiceActive()
}
