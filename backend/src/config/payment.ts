export const paymentConfig = {
  mercadopago: {
    webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
    sandbox: process.env.NODE_ENV !== 'production',
  },
}
