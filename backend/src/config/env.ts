import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3333'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET deve ter no mínimo 10 caracteres'),
})

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Erro de validação das variáveis de ambiente:', parsed.error.format())
    throw new Error('Ambiente inválido')
  }

  return parsed.data
}

export const env = parseEnv()
