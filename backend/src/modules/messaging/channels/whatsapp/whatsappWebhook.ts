import crypto from 'crypto'
import { Request, Response } from 'express'
import { prisma } from '../../../../config/database'
import { whatsappConfig } from '../../../../config/whatsapp'
import { emitToClinic } from '../../../../shared/websocket/socketServer'
import {
  getWhatsappIntegrationByPhoneNumberId,
  getWhatsappIntegrationByVerifyToken,
} from '../../services/resolveWhatsappCredentials'

type IncomingMessageContext = {
  clinicId?: string | null
  profileName?: string | null
}

export class WhatsappWebhookController {
  async verify(req: Request, res: Response) {
    const mode = typeof req.query['hub.mode'] === 'string' ? req.query['hub.mode'] : undefined
    const token = typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : undefined
    const challenge = req.query['hub.challenge']

    const integration = await getWhatsappIntegrationByVerifyToken(token)
    const validToken = !!token && (token === whatsappConfig.webhookVerifyToken || !!integration)

    if (mode === 'subscribe' && validToken) {
      console.log('[WhatsApp Webhook] Verificado com sucesso')
      return res.status(200).send(challenge)
    }

    console.error('[WhatsApp Webhook] Falha na verificação: token inválido')
    return res.status(403).send('Forbidden')
  }

  async handle(req: Request, res: Response) {
    res.status(200).send('OK')

    try {
      const body = req.body
      if (body.object !== 'whatsapp_business_account') {
        return
      }

      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      if (!value) {
        return
      }

      const phoneNumberId = value?.metadata?.phone_number_id as string | undefined
      const integration = await getWhatsappIntegrationByPhoneNumberId(phoneNumberId)
      const appSecret = integration?.waAppSecret || whatsappConfig.appSecret

      if (appSecret) {
        const signature = req.headers['x-hub-signature-256'] as string | undefined
        if (!signature) {
          console.warn('[WhatsApp Webhook] Requisição sem assinatura ignorada')
          return
        }

        const expected = `sha256=${crypto
          .createHmac('sha256', appSecret)
          .update(JSON.stringify(req.body))
          .digest('hex')}`

        if (signature !== expected) {
          console.error('[WhatsApp Webhook] Assinatura inválida')
          return
        }
      }

      if (value?.messages?.length) {
        const profileName: string | null = value?.contacts?.[0]?.profile?.name ?? null
        for (const msg of value.messages) {
          await this.handleIncomingMessage(msg, {
            clinicId: integration?.clinicId,
            profileName,
          })
        }
      }

      if (value?.statuses?.length) {
        for (const status of value.statuses) {
          await this.handleStatusUpdate(status)
        }
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Erro ao processar evento:', err)
    }
  }

  private async handleIncomingMessage(msg: any, context: IncomingMessageContext = {}) {
    const from: string = msg.from
    const waId: string = msg.id
    const timestamp = Number(msg.timestamp) * 1000

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

    const clinic = context.clinicId
      ? await prisma.clinic.findUnique({ where: { id: context.clinicId } })
      : await prisma.clinic.findFirst()

    if (!clinic) {
      console.warn('[WhatsApp Webhook] Nenhuma clínica cadastrada. Mensagem descartada.')
      return
    }

    let contact = await prisma.contact.findFirst({
      where: { clinicId: clinic.id, phone: from },
    })

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          clinicId: clinic.id,
          phone: from,
          name: context.profileName ?? null,
        },
      })
      console.log(`[WhatsApp Webhook] Novo contato criado: ${contact.id} (${from})`)
    }

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

    const exists = await prisma.externalMessage.count({
      where: { channelMessageId: waId },
    })

    if (exists > 0) {
      console.log(`[WhatsApp Webhook] Mensagem duplicada ignorada: ${waId}`)
      return
    }

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

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(timestamp),
        unreadCount: { increment: 1 },
      },
    })

    emitToClinic(clinic.id, 'messaging:new_message', {
      conversationId: conversation.id,
      message: savedMessage,
      contact: { phone: from, name: context.profileName },
    })

    console.log(`[WhatsApp Webhook] Mensagem persistida (conversa ${conversation.id})`)
  }

  private async handleStatusUpdate(status: any) {
    const waId: string = status.id
    const statusValue: string = status.status

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
