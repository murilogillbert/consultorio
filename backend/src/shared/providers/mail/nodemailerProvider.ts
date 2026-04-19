// The actual Nodemailer implementation lives in:
// src/modules/messaging/channels/email/emailAdapter.ts
// This file re-exports it for use via the MailProvider interface.
export { sendEmail } from '../../../shared/services/emailService'
