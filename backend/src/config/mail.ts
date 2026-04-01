export const emailConfig = {
  driver: process.env.MAIL_DRIVER || 'ethereal', // 'ses' or 'ethereal'
  from: {
    email: 'contato@clinicavitalis.com.br',
    name: 'Clínica Vitalis',
  },
}
