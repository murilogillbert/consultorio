import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend EquipmentResponseDto:
// { id, name, description, serialNumber, location, status, maintenanceDate, isActive, createdAt }
interface EquipmentRaw {
  id: string
  name: string
  description?: string | null
  serialNumber?: string | null
  location?: string | null
  status: string
  maintenanceDate?: string | null
  isActive: boolean
  createdAt: string
}

export interface Equipment {
  id: string
  clinicId: string
  name: string
  category: string
  serialNumber?: string | null
  isMobile: boolean
  defaultRoomId?: string | null
  currentRoomId?: string | null
  status: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  defaultRoom?: { id: string; name: string } | null
  currentRoom?: { id: string; name: string } | null
}

function mapEquipment(e: EquipmentRaw): Equipment {
  return {
    id: e.id,
    clinicId: '',
    name: e.name,
    category: 'GENERAL',
    serialNumber: e.serialNumber,
    isMobile: false,
    status: e.status,
    notes: e.description,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }
}

export function useEquipments(clinicId?: string) {
  return useQuery<Equipment[]>({
    queryKey: ['equipments', clinicId],
    queryFn: async () => {
      const { data } = await api.get<EquipmentRaw[]>('/equipments')
      return data.map(mapEquipment)
    },
    enabled: !!clinicId,
  })
}

export function useEquipment(id?: string) {
  return useQuery<Equipment>({
    queryKey: ['equipment', id],
    queryFn: async () => {
      const { data } = await api.get<EquipmentRaw>(`/equipments/${id}`)
      return mapEquipment(data)
    },
    enabled: !!id,
  })
}

export function useCreateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Equipment> & { clinicId: string }) => {
      const body = {
        name: payload.name,
        description: payload.notes,
        serialNumber: payload.serialNumber,
        status: payload.status || 'OPERATIONAL',
      }
      const { data } = await api.post<EquipmentRaw>('/equipments', body)
      return mapEquipment(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipments'] }),
  })
}

export function useUpdateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Equipment> & { id: string }) => {
      const body: any = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.notes !== undefined) body.description = payload.notes
      if (payload.serialNumber !== undefined) body.serialNumber = payload.serialNumber
      if (payload.status !== undefined) body.status = payload.status
      const { data } = await api.put<EquipmentRaw>(`/equipments/${id}`, body)
      return mapEquipment(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipments'] }),
  })
}

export function useDeleteEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/equipments/${id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipments'] }),
  })
}
