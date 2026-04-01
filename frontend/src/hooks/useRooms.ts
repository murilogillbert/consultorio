import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Room {
  id: string
  clinicId: string
  name: string
  type: string
  active: boolean
}

export function useRooms(clinicId?: string) {
  return useQuery({
    queryKey: ['rooms', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/rooms?clinicId=${clinicId}` : '/rooms'
      const { data } = await api.get<Room[]>(url)
      return data
    }
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Room>) => {
      const response = await api.post('/rooms', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Room> & { id: string }) => {
      const { id, ...rest } = data
      const response = await api.put(`/rooms/${id}`, rest)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rooms/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}
