import { Router } from 'express'
import { AnnouncementsController } from '../modules/announcements/controllers/announcementsController'
import { ensureAuthenticated } from '../shared/middlewares/ensureAuthenticated'

const r = Router()
const ctrl = new AnnouncementsController()

// Listar avisos (autenticado — qualquer funcionário)
r.get('/', ensureAuthenticated, ctrl.index)

// Criar aviso (admin/staff)
r.post('/', ensureAuthenticated, ctrl.create)

// Editar aviso
r.put('/:id', ensureAuthenticated, ctrl.update)

// Arquivar (soft delete)
r.delete('/:id', ensureAuthenticated, ctrl.remove)

// Marcar como lido (usuário corrente)
r.post('/:id/read', ensureAuthenticated, ctrl.markRead)

// Estatísticas de leitura
r.get('/:id/stats', ensureAuthenticated, ctrl.readStats)

// Reenviar aviso
r.post('/:id/resend', ensureAuthenticated, ctrl.resend)

export default r
