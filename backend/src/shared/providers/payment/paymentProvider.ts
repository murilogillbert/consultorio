export interface PaymentProvider {
  createPixCharge(params: { amount: number; description?: string }): Promise<{ pixCode: string; gatewayId: string }>
  createBoleto(params: { amount: number; customerName: string; customerCpf: string }): Promise<{ boletoUrl: string; gatewayId: string }>
  createCardLink(params: { amount: number; description?: string }): Promise<{ paymentLinkUrl: string; gatewayId: string }>
  refund(gatewayId: string): Promise<void>
}
