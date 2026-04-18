import { Request, Response } from 'express'
import { whatsappConfig } from '../../../../config/whatsapp'
import { prisma } from '../../../../config/database'
import { emitToClinic } from '../../../../shared/websocket/socketServer'
import crypto from 'crypto'

export class WhatsappWebhookController {
  /**
   * GET — Verificação do webhook pela Meta
   */
  async verify(req: Request, res: Response) {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === whatsappConfig.webhookVerifyToken) {
      console.log('[WhatsApp Webhook] Verificado com sucesso!')
      return res.status(200).send(challenge)
    }

    console.error('[WhatsApp Webhook] Falha na verificação: token inválido')
    return res.status(403).send('Forbidden')
  }

  /**
   * POST — Recebe mensagens e status vindos da Meta
   */
  async handle(req: Request, res: Response) {
    // Responde imediatamente para a Meta (obrigatório em até 5s)
    res.status(200).send('OK')

    try {
      // Validação de assinatura HMAC (se appSecret configurado)
      if (whatsappConfig.appSecret) {
        const signature = req.headers['x-hub-signature-256'] as string
        if (!signature) {
          console.warn('[WhatsApp Webhook] Requisição sem assinatura ignorada')
          return
        }
        const expected = 'sha256=' +
          crypto.createHmac('sha256', whatsappConfig.appSecret)
            .update(JSON.stringify(req.body))
            .digest('hex')
        if (signature !== expected) {
          console.error('[WhatsApp Webhook] Assinatura inválida')
          return
        }
      }

      const body = req.body
      if (body.object !== 'whatsapp_business_account') return

      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      if (!value) return

      // ── Mensagens recebidas ──────────────────────────────────────
      if (value?.messages?.length) {
        const profileName: string | null = value?.contacts?.[0]?.profile?.name ?? null
        for (const msg of value.messages) {
          await this.handleIncomingMessage(msg, profileName)
        }
      }

      // ── Atualizações de status (sent / delivered / read) ─────────
      if (value?.statuses?.length) {
        for (const status of value.statuses) {
          await this.handleStatusUpdate(status)
        }
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Erro ao processar evento:', err)
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Mensagem recebida: cria/atualiza Contato, Conversa e ExternalMessage
  // ────────────────────────────────────────────────────────────────
  private async handleIncomingMessage(msg: any, profileName?: string | null) {
    const from: string = msg.from          // número do remetente (E.164 sem +)
    const waId: string = msg.id            // ID único da mensagem no Meta
    const timestamp = Number(msg.timestamp) * 1000

    // Extrai o conteúdo conforme o tipo
    let content: string | undefined
    let type = 'TEXT'

    if (msg.type === 'text') {
      content = msg.text?.body
      type = 'TEXT'
    } else if (msg.type === 'image') {
      content = msg.image?.caption
      type = 'IMAGE'
    } else if (msg.type === 'audio') {
      type = 'AUDIO'
    } else if (msg.type === 'document') {
      content = msg.document?.filename
      type = 'DOCUMENT'
    } else {
      type = msg.type?.toUpperCase() || 'UNKNOWN'
    }

    console.log(`[WhatsApp Webhook] Mensagem de ${from}: ${content ?? `[${type}]`}`)

    // Busca ou cria clínica (usa a primeira — sistema single-tenant por enquanto)
    const clinic = await prisma.clinic.findFirst()
    if (!clinic) {
      console.warn('[WhatsApp Webhook] Nenhuma clínica cadastrada. Mensagem descartada.')
      return
    }

    // Busca ou cria Contato pelo telefone
    let contact = await prisma.contact.findFirst({
      where: { clinicId: clinic.id, phone: from },
    })
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          clinicId: clinic.id,
          phone: from,
          name: profileName ?? null,
        },
      })
      console.log(`[WhatsApp Webhook] Novo contato criado: ${contact.id} (${from})`)
    }

    // Busca ou cria Conversa aberta para este contato
    let conversation = await prisma.conversation.findFirst({
      where: {
        clinicId: clinic.id,
        contactId: contact.id,
        channel: 'WHATSAPP',
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          clinicId: clinic.id,
          contactId: contact.id,
          channel: 'WHATSAPP',
          status: 'OPEN',
          unreadCount: 0,
        },
      })
      console.log(`[WhatsApp Webhook] Nova conversa criada: ${conversation.id}`)
    }

    // Deduplica: não salva se já existe mensagem com este waId
    const exists = await prisma.externalMessage.count({
      where: { channelMessageId: waId },
    })
    if (exists > 0) {
      console.log(`[WhatsApp Webhook] Mensagem duplicada ignorada: ${waId}`)
      return
    }

    // Persiste a mensagem
    const savedMessage = await prisma.externalMessage.create({
      data: {
        conversationId: conversation.id,
        channelMessageId: waId,
        direction: 'IN',
        type,
        content,
        metadata: JSON.stringify({ from, timestamp }),
      },
    })

    // Atualiza conversa: incrementa unread e registra timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(timestamp),
        unreadCount: { increment: 1 },
      },
    })

    // Emite evento em tempo real para todos os usuários da clínica
    emitToClinic(clinic.id, 'messaging:new_message', {
      conversationId: conversation.id,
      message: savedMessage,
      contact: { phone: from, name: profileName },
    })

    console.log(`[WhatsApp Webhook] Mensagem persistida (conversa ${conversation.id})`)
  }

  // ────────────────────────────────────────────────────────────────
  // Atualização de status: marca readAt / deliveredAt na mensagem
  // ────────────────────────────────────────────────────────────────
  private async handleStatusUpdate(status: any) {
    const waId: string = status.id
    const statusValue: string = status.status  // sent | delivered | read | failed

    console.log(`[WhatsApp Webhook] Status [${waId}]: ${statusValue}`)

    if (statusValue === 'read') {
      await prisma.externalMessage.updateMany({
        where: { channelMessageId: waId },
        data: { readAt: new Date() },
      })
    } else if (statusValue === 'delivered') {
      await prisma.externalMessage.updateMany({
        where: { channelMessageId: waId },
        data: { deliveredAt: new Date() },
      })
    }
  }
}
