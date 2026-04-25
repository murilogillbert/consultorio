import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './shared/middlewares/errorHandler'
import routes from './routes'

const app = express()

// Middlewares Basics
app.use(cors())
app.use(express.json({
  verify: (req, _res, buf) => {
    // Preserve raw body for webhook HMAC verification (Meta/WhatsApp/Instagram).
    ;(req as express.Request & { rawBody?: Buffer }).rawBody = buf
  },
}))

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per `window`
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
})
app.use('/api', limiter)

// Uploads static directory
app.use('/uploads', express.static('uploads'))

// Main Routes
app.use('/api', routes)

// Global Error Handler
app.use(errorHandler)

export default app
