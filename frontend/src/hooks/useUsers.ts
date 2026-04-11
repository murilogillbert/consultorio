import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// NOTE: backend does not expose a UsersController yet. This hook returns an
// empty list and no-op mutations so the admin UI renders without 404 errors.

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
  permissions?: Record<string, boolean>
}

export function useSystemUsers(_clinicId?: string) {
  return useQuery<SystemUser[]>({
    queryKey: ['systemUsers'],
    queryFn: async () => [],
    staleTime: Infinity,
  })
}

export function useCreateSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: any) => ({ }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
  })
}

export function useUpdateSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: any) => ({ }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
  })
}

export function useDeleteSystemUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (_: string) => { /* no-op */ },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
  })
}
