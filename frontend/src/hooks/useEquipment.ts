import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

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

export function useEquipments(clinicId?: string) {
  return useQuery<Equipment[]>({
    queryKey: ['equipments', clinicId],
    queryFn: async () => {
      const { data } = await api.get('/equipments', { params: { clinicId } })
      return data
    },
    enabled: !!clinicId,
  })
}

export function useEquipment(id?: string) {
  return useQuery<Equipment>({
    queryKey: ['equipment', id],
    queryFn: async () => {
      const { data } = await api.get(`/equipments/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Equipment> & { clinicId: string }) => {
      const { data } = await api.post('/equipments', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipments'] }),
  })
}

export function useUpdateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Equipment> & { id: string }) => {
      const { data } = await api.put(`/equipments/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipments'] }),
  })
}

export function useDeleteEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/equipments/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipments'] }),
  })
}
