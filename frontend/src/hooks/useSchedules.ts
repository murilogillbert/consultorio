import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface AvailableSlot {
  startTime: string
  endTime: string
}

export interface ScheduleSlot {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  active: boolean
}

export function useAvailableSlots(professionalId: string | undefined, date: string | undefined, serviceId: string | undefined) {
  return useQuery({
    queryKey: ['available-slots', professionalId, date, serviceId],
    queryFn: async () => {
      const { data } = await api.get<AvailableSlot[]>(`/schedules/${professionalId}/available`, {
        params: { date, serviceId }
      })
      return data
    },
    enabled: !!professionalId && !!date && !!serviceId
  })
}

export function useProfessionalSchedule(professionalId: string | undefined) {
  return useQuery({
    queryKey: ['schedules', professionalId],
    queryFn: async () => {
      const { data } = await api.get<ScheduleSlot[]>(`/schedules/${professionalId}`)
      return data
    },
    enabled: !!professionalId
  })
}

export function useSetSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ professionalId, slots }: {
      professionalId: string
      slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
    }) => {
      const { data } = await api.put(`/schedules/${professionalId}`, { slots })
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.professionalId] })
    }
  })
}

export function useBlockDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ professionalId, ...blockData }: {
      professionalId: string
      startTime: string
      endTime: string
      reason?: string
    }) => {
      const { data } = await api.post(`/schedules/${professionalId}/blocks`, blockData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
    }
  })
}

export function useUnblockDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blockId: string) => {
      await api.delete(`/schedules/blocks/${blockId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
    }
  })
}
