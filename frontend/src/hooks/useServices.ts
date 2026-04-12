import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend ServiceResponseDto:
// { id, name, description, durationMinutes, price, category, requiresRoom, defaultRoomId, color, isActive, createdAt }
interface ServiceResponseDtoRaw {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  category?: string
  requiresRoom: boolean
  defaultRoomId?: string
  color?: string
  isActive: boolean
  createdAt: string
}

// Shape expected by the UI pages
export interface Service {
  id: string
  name: string
  description?: string
  shortDescription?: string
  category?: string
  duration: number
  price: number
  preparation?: string
  onlineBooking: boolean
  active: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
  professionals?: Array<{ professional: { id: string; user?: { name: string } } }>
  insurances?: Array<{ insurancePlan: { id: string; name: string } }>
}

function mapService(raw: ServiceResponseDtoRaw): Service {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    duration: raw.durationMinutes,
    // Backend stores price as decimal (reais). UI expects cents.
    price: Math.round(Number(raw.price) * 100),
    onlineBooking: true,
    active: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.createdAt,
    professionals: [],
    insurances: [],
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
  category?: string
  duration: number
  price: number
  preparation?: string
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
    durationMinutes: p.duration,
    // UI sends cents, backend expects decimal reais
    price: (p.price || 0) / 100,
    category: p.category,
    requiresRoom: !!p.roomId,
    defaultRoomId: p.roomId || null,
    color: '#007BFF',
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
      if (updateData.name !== undefined) payload.name = updateData.name
      if (updateData.description !== undefined) payload.description = updateData.description
      if (updateData.category !== undefined) payload.category = updateData.category
      if (updateData.duration !== undefined) payload.durationMinutes = updateData.duration
      if (updateData.price !== undefined) payload.price = updateData.price / 100
      if (updateData.roomId !== undefined) {
        payload.requiresRoom = !!updateData.roomId
        payload.defaultRoomId = updateData.roomId || null
      }
      if (updateData.active !== undefined) payload.isActive = updateData.active
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
