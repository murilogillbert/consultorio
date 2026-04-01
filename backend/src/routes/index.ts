import { Router } from 'express'
import authRoutes from './authRoutes'
import usersRoutes from './usersRoutes'
import clinicRoutes from './clinicRoutes'
import patientsRoutes from './patientsRoutes'
import equipmentRoutes from './equipmentRoutes'
import appointmentsRoutes from './appointmentsRoutes'
import professionalsRoutes from './professionalsRoutes'
import serviceRoutes from './serviceRoutes'
import roomsRoutes from './roomsRoutes'
import schedulesRoutes from './schedulesRoutes'
import publicRoutes from './publicRoutes'
import insuranceRoutes from './insuranceRoutes'
import messagingRoutes from './messagingRoutes'
import metricsRoutes from './metricsRoutes'

const r = Router()

// Public routes (no auth)
r.use('/auth', authRoutes)
r.use('/public', publicRoutes)

// Protected / Main Routes
r.use('/users', usersRoutes)
r.use('/clinics', clinicRoutes)
r.use('/patients', patientsRoutes)
r.use('/equipments', equipmentRoutes)
r.use('/appointments', appointmentsRoutes)
r.use('/professionals', professionalsRoutes)
r.use('/services', serviceRoutes)
r.use('/rooms', roomsRoutes)
r.use('/schedules', schedulesRoutes)
r.use('/insurances', insuranceRoutes)
r.use('/messaging', messagingRoutes)
r.use('/metrics', metricsRoutes)

export default r
