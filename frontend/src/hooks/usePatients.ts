import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

// Backend PatientResponseDto (flat):
// { id, userId, name, email, cpf, phone, birthDate, address, city, state, notes, isActive, createdAt }
interface PatientRaw {
  id: string
  userId: string
  name: string
  email: string
  cpf?: string
  phone?: string
  birthDate?: string
  address?: string
  city?: string
  state?: string
  notes?: string
  isActive: boolean
  createdAt: string
}

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

function mapPatient(p: PatientRaw): Patient {
  return {
    id: p.id,
    userId: p.userId,
    cpf: p.cpf || '',
    phone: p.phone,
    birthDate: p.birthDate,
    address: p.address,
    notes: p.notes,
    user: {
      id: p.userId,
      name: p.name,
      email: p.email,
    },
  }
}

export function usePatients(query?: string) {
  return useQuery({
    queryKey: ['patients', query],
    queryFn: async () => {
      const url = query ? `/patients?q=${encodeURIComponent(query)}` : '/patients'
      const { data } = await api.get<PatientRaw[]>(url)
      return data.map(mapPatient)
    }
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Patient> & { id: string }) => {
      // Omit fields that are empty string to avoid backend parse errors (e.g. birthDate: "")
      const payload: any = {}
      if (data.user?.name) payload.name = data.user.name
      if (data.cpf) payload.cpf = data.cpf
      if (data.phone) payload.phone = data.phone
      if (data.birthDate) payload.birthDate = data.birthDate
      if (data.address) payload.address = data.address
      if (data.notes) payload.notes = data.notes
      const { data: result } = await api.put<PatientRaw>(`/patients/${id}`, payload)
      return mapPatient(result)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patients', id] })
    }
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/patients/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] })
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const { data } = await api.get<PatientRaw>(`/patients/${id}`)
      return mapPatient(data)
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
      const payload = {
        name: patientData.name,
        email: patientData.email,
        cpf: patientData.cpf,
        phone: patientData.phone,
        birthDate: patientData.birthDate,
        address: patientData.address,
        notes: patientData.notes,
      }
      const { data } = await api.post<PatientRaw>('/patients', payload)
      return mapPatient(data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] })
  })
}
