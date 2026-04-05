import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Patient {
  id: string
  userId: string
  cpf: string
  phone?: string
  birthDate?: string
  address?: string
  notes?: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export function usePatients(query?: string) {
  return useQuery({
    queryKey: ['patients', query],
    queryFn: async () => {
      const url = query ? `/patients?q=${query}` : '/patients'
      const { data } = await api.get<Patient[]>(url)
      return data
    }
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Patient> & { id: string }) => {
      const response = await api.put(`/patients/${id}`, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patients', id] })
    }
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const { data } = await api.get<Patient>(`/patients/${id}`)
      return data
    },
    enabled: !!id
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patientData: {
      userId?: string
      name?: string
      email?: string
      cpf: string
      phone?: string
      birthDate?: string
      address?: string
      notes?: string
    }) => {
      const { data } = await api.post('/patients', patientData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    }
  })
}
