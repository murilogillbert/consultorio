import app from './app'
import { PrismaClient } from '@prisma/client'

const port = process.env.PORT || 3333
export const prisma = new PrismaClient()

async function bootstrap() {
  try {
    await prisma.$connect()
    console.log('Database connected successfully')

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`)
    })
  } catch (err) {
    console.error('Failed to connect to database', err)
    process.exit(1)
  }
}

bootstrap()
