import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface Patient {
  id: string
  userId: string
  cpf: string
  phone?: string
  birthDate?: string
  address?: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data } = await api.get<Patient[]>('/patients')
      return data
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
      cpf: string
      phone?: string
      birthDate?: string
      address?: string
    }) => {
      const { data } = await api.post('/patients', patientData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    }
  })
}
