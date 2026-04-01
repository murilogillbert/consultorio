import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface SystemUser {
  id: string
  clinicId: string
  userId: string
  role: string
  active: boolean
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    active: boolean
  }
}

export function useSystemUsers(clinicId?: string) {
  return useQuery({
    queryKey: ['systemUsers', clinicId],
    queryFn: async () => {
      const url = clinicId ? `/users/system/list?clinicId=${clinicId}` : '/users/system/list'
      const { data } = await api.get<SystemUser[]>(url)
      return data
    }
  })
}

export function useCreateSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/users/system/create', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
    }
  })
}

export function useUpdateSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any & { id: string }) => {
      const { id, ...rest } = data
      const response = await api.put(`/users/system/${id}`, rest)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
    }
  })
}

export function useDeleteSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/system/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
    }
  })
}
