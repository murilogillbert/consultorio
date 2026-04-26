import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export interface PaymentItem {
  id: string
  appointmentId: string
  patientId?: string
  patientName?: string
  serviceName?: string
  appointmentStartTime?: string
  appointmentStatus?: string
  amount: number
  status: string
  paymentMethod?: string
  paymentDate?: string
  notes?: string
  createdAt: string
}

export function usePatientUnpaidPayments(patientId: string | null | undefined) {
  return useQuery<PaymentItem[]>({
    queryKey: ['payments', 'unpaid', patientId],
    queryFn: async () => {
      const { data } = await api.get<PaymentItem[]>('/payments', {
        params: { patientId, status: 'PENDING' },
      })
      return data
    },
    enabled: !!patientId,
  })
}

export function useMarkPaymentPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data } = await api.post<PaymentItem>(`/payments/${paymentId}/pay`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
