import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface SystemUser {
  id: string
  clinicId: string
  userId: string
  role: string
  active: boolean
  createdAt: string
  generatedPassword?: string
  permissions?: Record<string, boolean>
  user: {
    id: string
    name: string
    email: string
    phone?: string
    active: boolean
  }
}

export function useSystemUsers(clinicId?: string) {
  return useQuery<SystemUser[]>({
    queryKey: ['systemUsers', clinicId],
    queryFn: async () => {
      const { data } = await api.get<SystemUser[]>('/system-users')
      return data
    },
    enabled: !!clinicId,
  })
}

export function useCreateSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      clinicId?: string
      name: string
      email: string
      role: string
      active?: boolean
      password?: string
      phone?: string
      permissions?: Record<string, boolean>
    }) => {
      const { data } = await api.post<SystemUser>('/system-users', input)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
  })
}

export function useUpdateSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      email?: string
      role?: string
      active?: boolean
      permissions?: Record<string, boolean>
    }) => {
      const { id, ...payload } = input
      const { data } = await api.put<SystemUser>(`/system-users/${id}`, payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
  })
}

export function useDeleteSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/system-users/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
  })
}
