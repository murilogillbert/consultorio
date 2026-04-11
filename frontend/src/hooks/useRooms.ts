import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend RoomResponseDto: { id, name, description, location, capacity, isActive, createdAt }
interface RoomRaw {
  id: string
  name: string
  description?: string
  location?: string
  capacity?: number
  isActive: boolean
  createdAt: string
}

export interface Room {
  id: string
  clinicId: string
  name: string
  type: string
  active: boolean
  description?: string
  location?: string
  capacity?: number
}

function mapRoom(r: RoomRaw): Room {
  return {
    id: r.id,
    clinicId: '',
    name: r.name,
    type: 'GENERAL',
    active: r.isActive,
    description: r.description,
    location: r.location,
    capacity: r.capacity,
  }
}

export function useRooms(_clinicId?: string) {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data } = await api.get<RoomRaw[]>('/rooms')
      return data.map(mapRoom)
    }
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Room>) => {
      const payload = {
        name: data.name,
        description: data.description,
        location: data.location,
        capacity: data.capacity,
      }
      const { data: result } = await api.post<RoomRaw>('/rooms', payload)
      return mapRoom(result)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Room> & { id: string }) => {
      const { id, ...rest } = data
      const payload: any = {}
      if (rest.name !== undefined) payload.name = rest.name
      if (rest.description !== undefined) payload.description = rest.description
      if (rest.location !== undefined) payload.location = rest.location
      if (rest.capacity !== undefined) payload.capacity = rest.capacity
      if (rest.active !== undefined) payload.isActive = rest.active
      const { data: result } = await api.put<RoomRaw>(`/rooms/${id}`, payload)
      return mapRoom(result)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/rooms/${id}`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  })
}
