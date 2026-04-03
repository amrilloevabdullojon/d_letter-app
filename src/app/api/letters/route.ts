import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { FileStatus, FileStorageProvider } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { addWorkingDays, sanitizeInput } from '@/lib/utils'
import { buildApplicantPortalLink, sendMultiChannelNotification } from '@/lib/notifications'
import { dispatchNotification } from '@/lib/notification-dispatcher'
import { logger } from '@/lib/logger.server'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { withValidation } from '@/lib/api-handler'
import {
  createLetterSchema,
  letterFiltersSchema,
  paginationSchema,
  quickLetterAiMetadataSchema,
} from '@/lib/schemas'
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  PORTAL_TOKEN_EXPIRY_DAYS,
  DEFAULT_DEADLINE_WORKING_DAYS,
} from '@/lib/constants'
import { CACHE_TTL } from '@/lib/cache'
import { getLettersListCached, invalidateLettersCache } from '@/lib/list-cache'
import { requirePermission } from '@/lib/permission-guard'
import { csrfGuard } from '@/lib/security'
import { generatePortalToken } from '@/lib/token'
import { deleteLocalFile, saveLocalUpload } from '@/lib/file-storage'
import { syncFileToDrive } from '@/lib/file-sync'
import { z } from 'zod'
import type { LetterSummary, PaginationMeta } from '@/types/dto'

const lettersQuerySchema = paginationSchema.merge(letterFiltersSchema)

type LettersQueryInput = z.infer<typeof lettersQuerySchema>
type LettersListResponse =
  | { letters: LetterSummary[]; pagination: PaginationMeta }
  | { error: string }

type CreateLetterPayload = z.infer<typeof createLetterSchema>

const UPLOAD_STRATEGY = process.env.FILE_UPLOAD_STRATEGY || 'async'
const ENABLE_ASYNC_SYNC = process.env.FILE_SYNC_ASYNC !== 'false'

function readFormValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

function appendCommentSection(sections: string[], label: string, value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) return
  sections.push(`${label}:\n${trimmed}`)
}

function buildQuickImportComment(
  baseComment: string | undefined,
  metadata: z.infer<typeof quickLetterAiMetadataSchema>
): string | undefined {
  const sections: string[] = []
  const existingComment = baseComment?.trim()

  if (existingComment) {
    sections.push(existingComment)
  }

  const location = [metadata.region?.trim(), metadata.district?.trim()].filter(Boolean).join(', ')
  if (location) {
    sections.push(`AI-извлечение: регион и район — ${location}`)
  }

  appendCommentSection(sections, 'AI-перевод письма', metadata.contentRussian)

  if (sections.length === 0) {
    return undefined
  }

  const combined = sections.join('\n\n')
  if (combined.length <= 5000) {
    return combined
  }

  return `${combined.slice(0, 4950).trimEnd()}\n\n[AI-перевод сокращён]`
}

async function parseCreateLetterRequest(
  request: NextRequest
): Promise<
  | { success: true; data: CreateLetterPayload; file: File | null }
  | { success: false; response: NextResponse<{ error: string }> }
> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const rawPayload = {
      number: readFormValue(formData, 'number'),
      org: readFormValue(formData, 'org'),
      date: readFormValue(formData, 'date'),
      deadlineDate: readFormValue(formData, 'deadlineDate'),
      type: readFormValue(formData, 'type'),
      content: readFormValue(formData, 'content'),
      comment: readFormValue(formData, 'comment'),
      contacts: readFormValue(formData, 'contacts'),
      jiraLink: readFormValue(formData, 'jiraLink'),
      ownerId: readFormValue(formData, 'ownerId'),
      priority: readFormValue(formData, 'priority'),
      applicantName: readFormValue(formData, 'applicantName'),
      applicantEmail: readFormValue(formData, 'applicantEmail'),
      applicantPhone: readFormValue(formData, 'applicantPhone'),
      applicantTelegramChatId: readFormValue(formData, 'applicantTelegramChatId'),
    }

    const parsedPayload = createLetterSchema.safeParse(rawPayload)
    if (!parsedPayload.success) {
      return {
        success: false,
        response: NextResponse.json(
          { error: parsedPayload.error.errors[0].message },
          { status: 400 }
        ),
      }
    }

    const parsedMetadata = quickLetterAiMetadataSchema.safeParse({
      contentRussian: readFormValue(formData, 'contentRussian') || '',
      region: readFormValue(formData, 'region') || '',
      district: readFormValue(formData, 'district') || '',
    })

    if (!parsedMetadata.success) {
      return {
        success: false,
        response: NextResponse.json(
          { error: parsedMetadata.error.errors[0].message },
          { status: 400 }
        ),
      }
    }

    const fileEntry = formData.get('file')
    const file = fileEntry instanceof File ? fileEntry : null
    const data = parsedPayload.data
    data.comment = buildQuickImportComment(data.comment, parsedMetadata.data)

    return { success: true, data, file }
  }

  const body = await request.json()
  const parsedPayload = createLetterSchema.safeParse(body)
  if (!parsedPayload.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: parsedPayload.error.errors[0].message },
        { status: 400 }
      ),
    }
  }

  return { success: true, data: parsedPayload.data, file: null }
}

async function attachFileToLetter(params: { file: File; letterId: string; userId: string }) {
  if (params.file.size > MAX_FILE_SIZE) {
    throw new Error('Файл слишком большой. Максимум 10 MB.')
  }

  if (!ALLOWED_FILE_TYPES.includes(params.file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
    throw new Error('Тип файла не поддерживается.')
  }

  const timestamp = Date.now()
  const safeFileName = params.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storedFileName = `${timestamp}_${safeFileName}`

  let storagePath: string | null = null
  let fileId: string | null = null

  try {
    const bytes = await params.file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const localUpload = await saveLocalUpload({
      buffer,
      letterId: params.letterId,
      fileName: storedFileName,
    })

    storagePath = localUpload.storagePath

    let fileRecord = await prisma.file.create({
      data: {
        name: params.file.name,
        url: localUpload.url,
        size: params.file.size,
        mimeType: params.file.type,
        letterId: params.letterId,
        uploadedById: params.userId,
        storageProvider: FileStorageProvider.LOCAL,
        storagePath: localUpload.storagePath,
        status: FileStatus.PENDING_SYNC,
      },
    })

    fileId = fileRecord.id

    const queueSync = () => {
      if (!ENABLE_ASYNC_SYNC) return
      setTimeout(() => {
        syncFileToDrive(fileRecord.id).catch((error) => {
          logger.error('Background drive sync failed', error, { fileId: fileRecord.id })
        })
      }, 0)
    }

    if (UPLOAD_STRATEGY === 'sync') {
      try {
        const uploadResult = await syncFileToDrive(fileRecord.id)
        if (uploadResult) {
          const refreshed = await prisma.file.findUnique({ where: { id: fileRecord.id } })
          if (refreshed) {
            fileRecord = refreshed
          }
        } else {
          queueSync()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Drive upload failed'
        await prisma.file.update({
          where: { id: fileRecord.id },
          data: { uploadError: message, status: FileStatus.PENDING_SYNC },
        })
        queueSync()
      }
    } else {
      queueSync()
    }

    await prisma.history.create({
      data: {
        letterId: params.letterId,
        userId: params.userId,
        field: 'file_added',
        newValue: params.file.name,
      },
    })

    return fileRecord
  } catch (error) {
    if (fileId) {
      await prisma.file.delete({ where: { id: fileId } }).catch(() => null)
    }
    if (storagePath) {
      await deleteLocalFile(storagePath).catch(() => null)
    }
    throw error
  }
}

// ОПТИМИЗАЦИЯ: используем один SQL запрос вместо загрузки всех пользователей
const resolveAutoOwnerId = async (): Promise<string | null> => {
  // Используем raw SQL для эффективного подсчёта активных писем и выбора пользователя
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT u.id
    FROM "User" u
    WHERE u."canLogin" = true
    ORDER BY (
      SELECT COUNT(*)
      FROM "Letter" l
      WHERE l."ownerId" = u.id
        AND l."deletedAt" IS NULL
        AND l."status" NOT IN ('READY', 'PROCESSED', 'DONE')
    ) ASC, u.id ASC
    LIMIT 1
  `

  return result[0]?.id || null
}

// GET /api/letters - получить все письма
export const GET = withValidation<LettersListResponse, unknown, LettersQueryInput>(
  async (_request, session, { query }) => {
    const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const { page, limit, ...filters } = query
    const result = await getLettersListCached(filters, { page, limit }, session)

    const cacheSeconds = Math.max(1, Math.floor(CACHE_TTL.LETTERS_LIST / 1000))
    return NextResponse.json(
      {
        letters: result.letters,
        pagination: result.pagination,
      },
      {
        headers: {
          'Cache-Control': `private, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
        },
      }
    )
  },
  { querySchema: lettersQuerySchema, rateLimit: { limit: 120, windowMs: 60 * 1000 } }
)
// POST /api/letters - создать новое письмо
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request.headers)
    const rateLimitResult = await checkRateLimit(
      `${clientId}:/api/letters:POST`,
      RATE_LIMITS.standard.limit,
      RATE_LIMITS.standard.windowMs
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfError = csrfGuard(request)
    if (csrfError) {
      return csrfError
    }

    const permissionError = requirePermission(session.user.role, 'MANAGE_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const parsedRequest = await parseCreateLetterRequest(request)
    if (!parsedRequest.success) {
      return parsedRequest.response
    }

    const { data, file } = parsedRequest

    // Санитизация
    data.number = sanitizeInput(data.number, 50)
    data.org = sanitizeInput(data.org, 500)
    if (data.content) data.content = sanitizeInput(data.content, 10000)
    if (data.comment) data.comment = sanitizeInput(data.comment, 5000)
    if (data.contacts) data.contacts = sanitizeInput(data.contacts, 500)
    if (data.jiraLink) data.jiraLink = sanitizeInput(data.jiraLink, 500)
    if (data.applicantName) data.applicantName = sanitizeInput(data.applicantName, 200)
    if (data.applicantEmail) data.applicantEmail = sanitizeInput(data.applicantEmail, 320)
    if (data.applicantPhone) data.applicantPhone = sanitizeInput(data.applicantPhone, 50)
    if (data.applicantTelegramChatId)
      data.applicantTelegramChatId = sanitizeInput(data.applicantTelegramChatId, 50)

    const existing = await prisma.letter.findFirst({
      where: {
        number: { equals: data.number, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'Письмо с таким номером уже существует' }, { status: 409 })
    }

    // Рассчитать дедлайн (+7 рабочих дней если не указан)
    const ownerId = data.ownerId || (await resolveAutoOwnerId())

    const hasApplicantContact = !!(
      data.applicantEmail ||
      data.applicantPhone ||
      data.applicantTelegramChatId
    )
    const portalToken = hasApplicantContact ? generatePortalToken() : null
    const applicantAccessToken = portalToken?.hashed ?? null
    const applicantAccessTokenExpiresAt = hasApplicantContact
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * PORTAL_TOKEN_EXPIRY_DAYS)
      : null

    const deadlineDate =
      data.deadlineDate || addWorkingDays(data.date, DEFAULT_DEADLINE_WORKING_DAYS)

    // Подготовить список наблюдателей
    const watcherIds = new Set<string>()
    watcherIds.add(session.user.id)
    if (ownerId) watcherIds.add(ownerId)

    // Создать письмо, историю и watchers в одной транзакции
    const letter = await prisma.$transaction(async (tx) => {
      // Создать письмо
      const newLetter = await tx.letter.create({
        data: {
          number: data.number,
          org: data.org,
          date: data.date,
          deadlineDate,
          type: data.type,
          content: data.content,
          comment: data.comment,
          contacts: data.contacts,
          jiraLink: data.jiraLink,
          applicantName: data.applicantName,
          applicantEmail: data.applicantEmail,
          applicantPhone: data.applicantPhone,
          applicantTelegramChatId: data.applicantTelegramChatId,
          applicantAccessToken,
          applicantAccessTokenExpiresAt,
          ownerId,
          status: 'NOT_REVIEWED',
          priority: data.priority ?? 50,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Записать в историю
      await tx.history.create({
        data: {
          letterId: newLetter.id,
          userId: session.user.id,
          field: 'created',
          newValue: JSON.stringify({ number: newLetter.number, org: newLetter.org }),
        },
      })

      // Автоподписать наблюдателей
      if (watcherIds.size > 0) {
        await tx.watcher.createMany({
          data: Array.from(watcherIds).map((userId) => ({
            letterId: newLetter.id,
            userId,
            notifyOnChange: true,
            notifyOnComment: true,
            notifyOnDeadline: true,
          })),
          skipDuplicates: true,
        })
      }

      return newLetter
    })

    if (file) {
      try {
        await attachFileToLetter({
          file,
          letterId: letter.id,
          userId: session.user.id,
        })
      } catch (error) {
        await prisma.letter.delete({ where: { id: letter.id } }).catch(() => null)

        const message =
          error instanceof Error ? error.message : 'Не удалось прикрепить исходный файл к письму.'
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    if (letter.ownerId && letter.ownerId !== session.user.id) {
      await dispatchNotification({
        event: 'ASSIGNMENT',
        title: `Назначено письмо №-${letter.number}`,
        body: letter.org,
        letterId: letter.id,
        actorId: session.user.id,
        userIds: [letter.ownerId],
      })
    }

    if (hasApplicantContact && portalToken) {
      const portalLink = buildApplicantPortalLink(portalToken.raw)
      const subject = `Ваше обращение №${letter.number} зарегистрировано`
      const text = `Ваше обращение зарегистрировано.

Номер: ${letter.number}
Организация: ${letter.org}
Дедлайн: ${new Date(letter.deadlineDate).toLocaleDateString('ru-RU')}

Ссылка: ${portalLink}`
      const telegram = `
<b>Обращение зарегистрировано</b>

№${letter.number}
${letter.org}
Дедлайн: ${new Date(letter.deadlineDate).toLocaleDateString('ru-RU')}

<a href="${portalLink}">Открыть обращение</a>`

      await sendMultiChannelNotification(
        {
          email: letter.applicantEmail,
          phone: letter.applicantPhone,
          telegramChatId: letter.applicantTelegramChatId,
        },
        { subject, text, telegram }
      )
    }
    await invalidateLettersCache()
    return NextResponse.json({ success: true, letter }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/letters', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
