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
  showPrice?: boolean
  showDuration?: boolean
  category?: string
  requiresRoom: boolean
  defaultRoomId?: string
  color?: string
  isActive: boolean
  createdAt: string
  professionals: Array<{ id: string; name: string; avatarUrl?: string }>
  insurancePlans: Array<{ id: string; name: string; price?: number | null; showPrice: boolean }>
  equipments: Array<{ id: string; name: string }>
  rooms: Array<{ id: string; name: string }>
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
  showPrice: boolean
  /** Se TRUE, a duração/horário do serviço é exibida nas listagens públicas. */
  showDuration: boolean
  onlineBooking: boolean
  active: boolean
  defaultRoomId?: string
  imageUrl?: string
  createdAt: string
  updatedAt: string
  professionals?: Array<{ professional: { id: string; user?: { name: string; avatarUrl?: string } } }>
  insurances?: Array<{ insurancePlan: { id: string; name: string }; price?: number | null; showPrice: boolean }>
  equipments?: Array<{ id: string; name: string }>
  rooms?: Array<{ id: string; name: string }>
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
    showPrice: raw.showPrice ?? true,
    showDuration: raw.showDuration ?? true,
    onlineBooking: raw.onlineBooking ?? true,
    active: raw.isActive,
    defaultRoomId: raw.defaultRoomId,
    createdAt: raw.createdAt,
    updatedAt: raw.createdAt,
    professionals: (raw.professionals || []).map(p => ({
      professional: { id: p.id, user: { name: p.name, avatarUrl: p.avatarUrl } }
    })),
    insurances: (raw.insurancePlans || []).map(i => ({
      insurancePlan: { id: i.id, name: i.name },
      price: i.price ?? null,
      showPrice: i.showPrice ?? true,
    })),
    equipments: raw.equipments || [],
    rooms: raw.rooms || [],
  }
}

export function useServices(options?: { includeInactive?: boolean }) {
  const includeInactive = !!options?.includeInactive
  return useQuery({
    queryKey: ['services', { includeInactive }],
    queryFn: async () => {
      const url = includeInactive ? '/services?activeOnly=false' : '/services'
      const { data } = await api.get<ServiceResponseDtoRaw[]>(url)
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
  showPrice?: boolean
  showDuration?: boolean
  onlineBooking?: boolean
  imageUrl?: string
  roomId?: string
  insuranceIds?: string[]
  insurances?: Array<{ insuranceId: string; price?: number | null; showPrice: boolean }>
  professionalIds?: string[]
  equipmentIds?: string[]
  roomIds?: string[]
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
    showPrice: p.showPrice ?? true,
    showDuration: p.showDuration ?? true,
    category: p.category,
    requiresRoom: !!(p.roomId || (p.roomIds && p.roomIds.length > 0)),
    defaultRoomId: p.roomId || null,
    color: '#007BFF',
    professionalIds: p.professionalIds?.map(id => id) || [],
    insurances: p.insurances || p.insuranceIds?.map(id => ({ insuranceId: id, price: null, showPrice: true })) || [],
    equipmentIds: p.equipmentIds?.map(id => id) || [],
    roomIds: p.roomIds?.map(id => id) || [],
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
      if (updateData.showPrice !== undefined)        payload.showPrice        = updateData.showPrice
      if (updateData.showDuration !== undefined)     payload.showDuration     = updateData.showDuration
      if (updateData.roomId !== undefined) {
        payload.requiresRoom  = !!updateData.roomId
        payload.defaultRoomId = updateData.roomId || null
      }
      if (updateData.active !== undefined)           payload.isActive         = updateData.active
      if (updateData.professionalIds !== undefined)  payload.professionalIds  = updateData.professionalIds
      if (updateData.insurances !== undefined)        payload.insurances       = updateData.insurances
      else if (updateData.insuranceIds !== undefined)  payload.insurances       = updateData.insuranceIds.map((id: string) => ({ insuranceId: id, price: null, showPrice: true }))
      if (updateData.equipmentIds !== undefined)     payload.equipmentIds     = updateData.equipmentIds
      if (updateData.roomIds !== undefined)          payload.roomIds          = updateData.roomIds
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

// Delete service. Backend automatically soft-deletes (IsActive=false) when the
// service has appointments to preserve historical billing/data, and hard-deletes
// otherwise. Returns { mode: 'soft' | 'hard', message: string, appointmentCount? }.
export interface DeleteServiceResult {
  mode: 'soft' | 'hard'
  message?: string
  appointmentCount?: number
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<DeleteServiceResult> => {
      const { data } = await api.delete<DeleteServiceResult>(`/services/${id}`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  })
}

/** @deprecated Use useToggleServiceActive instead */
export function useArchiveService() {
  return useToggleServiceActive()
}

// ── Service Categories ──

export interface ServiceCategory {
  id: string
  name: string
}

export function useServiceCategories() {
  return useQuery({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      const { data } = await api.get<ServiceCategory[]>('/services/categories')
      return data
    }
  })
}

export function useCreateServiceCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<ServiceCategory>('/services/categories', { name })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['serviceCategories'] })
  })
}

export function useDeleteServiceCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/categories/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['serviceCategories'] })
  })
}
