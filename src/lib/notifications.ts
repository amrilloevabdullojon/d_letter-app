import 'server-only'
import nodemailer from 'nodemailer'
import { sendTelegramMessage } from '@/lib/telegram'
import { logger } from '@/lib/logger.server'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM = process.env.TWILIO_FROM

const APP_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || ''

type NotificationRecipient = {
  telegramChatId?: string | null
  email?: string | null
  phone?: string | null
}

export const buildApplicantPortalLink = (token: string) => {
  if (!APP_URL) return `/portal/${token}`
  return `${APP_URL.replace(/\/$/, '')}/portal/${token}`
}

const getTransport = () => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: (SMTP_PORT || 587) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
}

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  const transport = getTransport()
  if (!transport || !SMTP_FROM) {
    console.warn('SMTP not configured')
    return false
  }
  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
      html,
    })
    return true
  } catch (error) {
    logger.error('Notifications', error, { channel: 'email' })
    return false
  }
}

export const sendSms = async (to: string, text: string) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    console.warn('Twilio not configured')
    return false
  }

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
  const body = new URLSearchParams({
    To: to,
    From: TWILIO_FROM,
    Body: text,
  }).toString()

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    )

    if (!res.ok) {
      const data = await res.text()
      logger.error('Notifications', 'Failed to send SMS', { channel: 'sms', response: data })
      return false
    }

    return true
  } catch (error) {
    logger.error('Notifications', error, { channel: 'sms' })
    return false
  }
}

export const sendMultiChannelNotification = async (
  recipient: NotificationRecipient,
  message: { subject: string; text: string; telegram?: string }
) => {
  const results = {
    telegram: false,
    email: false,
    sms: false,
  }

  if (recipient.telegramChatId && message.telegram) {
    results.telegram = await sendTelegramMessage(recipient.telegramChatId, message.telegram)
  }

  if (recipient.email) {
    results.email = await sendEmail(recipient.email, message.subject, message.text)
  }

  if (recipient.phone) {
    results.sms = await sendSms(recipient.phone, message.text)
  }

  return results
}

/**
 * Send a notification to a user via their preferred channels
 *
 * Creates an in-app notification and optionally sends via email/telegram
 * based on user preferences.
 *
 * @example
 * ```ts
 * await sendNotification({
 *   userId: 'user123',
 *   type: 'NEW_REQUEST',
 *   title: 'New request',
 *   message: 'A new request has been created',
 *   link: '/requests/123',
 * })
 * ```
 */
export type SendNotificationInput = {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  letterId?: string
  requestId?: string
}

export const sendNotification = async (input: SendNotificationInput): Promise<void> => {
  const { prisma } = await import('@/lib/prisma')

  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      letterId: input.letterId,
    },
  })

  // Get user preferences for external notifications
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      email: true,
      telegramChatId: true,
      notifyEmail: true,
      notifyTelegram: true,
    },
  })

  if (!user) return

  // Send via external channels if enabled
  if (user.notifyEmail && user.email) {
    await sendEmail(user.email, input.title, input.message).catch((err) => {
      logger.error('Notifications', err, { channel: 'email', userId: input.userId })
    })
  }

  if (user.notifyTelegram && user.telegramChatId) {
    const telegramMessage = `*${input.title}*\n\n${input.message}${input.link ? `\n\n[Открыть](${APP_URL}${input.link})` : ''}`
    await sendTelegramMessage(user.telegramChatId, telegramMessage).catch((err) => {
      logger.error('Notifications', err, { channel: 'telegram', userId: input.userId })
    })
  }
}
