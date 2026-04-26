import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export type CategoryType = 'USER' | 'PROFESSIONAL' | 'SPECIALTY'

export interface Category {
  id: string
  type: CategoryType
  name: string
  description?: string
  parentId?: string | null
  parentName?: string | null
  isActive: boolean
  createdAt: string
}

export interface CreateCategoryInput {
  type: CategoryType
  name: string
  description?: string
  parentId?: string | null
}

export interface UpdateCategoryInput {
  id: string
  name?: string
  description?: string
  parentId?: string | null
  isActive?: boolean
}

export function useCategories(filters?: { type?: CategoryType; parentId?: string; activeOnly?: boolean }) {
  const params = new URLSearchParams()
  if (filters?.type) params.append('type', filters.type)
  if (filters?.parentId) params.append('parentId', filters.parentId)
  if (filters?.activeOnly) params.append('activeOnly', 'true')
  const qs = params.toString()

  return useQuery({
    queryKey: ['categories', filters?.type ?? 'all', filters?.parentId ?? '', filters?.activeOnly ?? false],
    queryFn: async () => {
      const { data } = await api.get<Category[]>(`/categories${qs ? `?${qs}` : ''}`)
      return data
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const { data } = await api.post<Category>('/categories', input)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateCategoryInput) => {
      const { data } = await api.put<Category>(`/categories/${id}`, patch)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
