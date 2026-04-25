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

type WhatsappIntegration = Awaited<ReturnType<typeof getWhatsappIntegrationByPhoneNumberId>>

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
      if (body?.object !== 'whatsapp_business_account') {
        return
      }

      const entries: any[] = Array.isArray(body.entry) ? body.entry : []

      for (const entry of entries) {
        const changes: any[] = Array.isArray(entry?.changes) ? entry.changes : []

        for (const change of changes) {
          const value = change?.value
          if (!value) continue

          const phoneNumberId = value?.metadata?.phone_number_id as string | undefined
          const integration = await getWhatsappIntegrationByPhoneNumberId(phoneNumberId)

          if (!this.verifySignature(req, integration)) {
            return
          }

          // If the payload identifies a phone_number_id but no integration matches it,
          // we cannot safely route the message — drop it instead of falling back.
          if (phoneNumberId && !integration && !whatsappConfig.appSecret) {
            console.warn(
              `[WhatsApp Webhook] Sem integração cadastrada para phone_number_id=${phoneNumberId}; evento descartado`,
            )
            continue
          }

          const profileName: string | null = value?.contacts?.[0]?.profile?.name ?? null

          for (const msg of value.messages ?? []) {
            await this.handleIncomingMessage(msg, {
              clinicId: integration?.clinicId,
              profileName,
            })
          }

          for (const status of value.statuses ?? []) {
            await this.handleStatusUpdate(status)
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Erro ao processar evento:', err)
    }
  }

  private verifySignature(req: Request, integration: WhatsappIntegration): boolean {
    const appSecret = integration?.waAppSecret || whatsappConfig.appSecret
    if (!appSecret) {
      return true
    }

    const signature = req.headers['x-hub-signature-256'] as string | undefined
    if (!signature) {
      console.warn('[WhatsApp Webhook] Requisição sem assinatura ignorada')
      return false
    }

    // Meta signs the raw HTTP body bytes; re-stringifying the parsed JSON
    // produces a different byte sequence (key order, escaping) and the HMAC
    // would never match. We rely on `rawBody` captured by express.json verify.
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    if (!rawBody) {
      console.error('[WhatsApp Webhook] rawBody indisponível para validar assinatura')
      return false
    }

    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('[WhatsApp Webhook] Assinatura inválida')
      return false
    }

    return true
  }

  private async handleIncomingMessage(msg: any, context: IncomingMessageContext = {}) {
    const from: string = msg.from
    const waId: string = msg.id
    const timestamp = Number(msg.timestamp) * 1000

    const { type, content, extra } = this.extractMessagePayload(msg)

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
        metadata: JSON.stringify({ from, timestamp, ...extra }),
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

  private extractMessagePayload(msg: any): {
    type: string
    content: string | undefined
    extra: Record<string, unknown>
  } {
    switch (msg.type) {
      case 'text':
        return { type: 'TEXT', content: msg.text?.body, extra: {} }
      case 'image':
        return {
          type: 'IMAGE',
          content: msg.image?.caption,
          extra: { mediaId: msg.image?.id, mimeType: msg.image?.mime_type },
        }
      case 'audio':
        return {
          type: 'AUDIO',
          content: undefined,
          extra: { mediaId: msg.audio?.id, mimeType: msg.audio?.mime_type, voice: msg.audio?.voice },
        }
      case 'video':
        return {
          type: 'VIDEO',
          content: msg.video?.caption,
          extra: { mediaId: msg.video?.id, mimeType: msg.video?.mime_type },
        }
      case 'document':
        return {
          type: 'DOCUMENT',
          content: msg.document?.filename,
          extra: { mediaId: msg.document?.id, mimeType: msg.document?.mime_type },
        }
      case 'sticker':
        return {
          type: 'STICKER',
          content: undefined,
          extra: { mediaId: msg.sticker?.id, mimeType: msg.sticker?.mime_type },
        }
      case 'location':
        return {
          type: 'LOCATION',
          content: msg.location?.name ?? msg.location?.address,
          extra: {
            latitude: msg.location?.latitude,
            longitude: msg.location?.longitude,
            address: msg.location?.address,
          },
        }
      case 'contacts':
        return {
          type: 'CONTACTS',
          content: msg.contacts?.[0]?.name?.formatted_name,
          extra: { contacts: msg.contacts },
        }
      case 'interactive': {
        const interactive = msg.interactive
        const buttonReply = interactive?.button_reply
        const listReply = interactive?.list_reply
        const reply = buttonReply ?? listReply
        return {
          type: 'INTERACTIVE',
          content: reply?.title ?? reply?.id,
          extra: { interactiveType: interactive?.type, replyId: reply?.id },
        }
      }
      case 'button':
        return {
          type: 'BUTTON',
          content: msg.button?.text,
          extra: { payload: msg.button?.payload },
        }
      case 'reaction':
        return {
          type: 'REACTION',
          content: msg.reaction?.emoji,
          extra: { messageId: msg.reaction?.message_id },
        }
      default:
        return {
          type: (msg.type as string | undefined)?.toUpperCase() || 'UNKNOWN',
          content: undefined,
          extra: { rawType: msg.type, errors: msg.errors },
        }
    }
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
      return
    }

    if (statusValue === 'delivered') {
      await prisma.externalMessage.updateMany({
        where: { channelMessageId: waId },
        data: { deliveredAt: new Date() },
      })
      return
    }

    if (statusValue === 'failed') {
      const failedAt = new Date().toISOString()
      const errors = Array.isArray(status.errors) ? status.errors : []
      const messages = await prisma.externalMessage.findMany({
        where: { channelMessageId: waId },
        select: { id: true, metadata: true },
      })

      for (const message of messages) {
        const previous = this.parseMetadata(message.metadata)
        await prisma.externalMessage.update({
          where: { id: message.id },
          data: {
            metadata: JSON.stringify({ ...previous, failedAt, errors }),
          },
        })
      }
    }
    // 'sent' is the default state right after submission and carries no extra info
    // beyond what we already have when persisting outbound messages — no-op.
  }

  private parseMetadata(metadata: string | null): Record<string, unknown> {
    if (!metadata) return {}
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
}
