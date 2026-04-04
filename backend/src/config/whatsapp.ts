export const whatsappConfig = {
  webhookVerifyToken: process.env.WA_VERIFY_TOKEN || 'vitalis_webhook_secret',
  appSecret: process.env.WA_APP_SECRET,
  apiUrl: 'https://graph.facebook.com/v19.0',
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  accessToken: process.env.WA_ACCESS_TOKEN,
}
