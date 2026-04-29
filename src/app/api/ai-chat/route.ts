import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as db } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger.server'
import { requirePermission } from '@/lib/permission-guard'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'missing-key',
  baseURL: 'https://api.x.ai/v1',
})

import { prisma } from '@/lib/prisma'
import { JiraService } from '@/services/jira.service'
import { analyzeFileWithGemini } from '@/lib/ai'

const SYSTEM_DATE = new Date().toLocaleDateString('ru-RU', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const body = await request.json()
    const { messages, filesData, currentLetterId } = body // Array of {role: 'user' | 'model', content: string}

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Пустой запрос' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1].content

    // 1. Сгенерировать эмбеддинг для последнего сообщения
    const embedding = await getEmbedding(lastMessage)

    // Получаем сводку по задачам пользователя
    const pendingLettersCount = await db.letter.count({
      where: {
        ownerId: session.user.id,
        status: { in: ['NOT_REVIEWED', 'ACCEPTED', 'IN_PROGRESS', 'CLARIFICATION'] },
        deletedAt: null,
      },
    })

    const overdueLettersCount = await db.letter.count({
      where: {
        ownerId: session.user.id,
        status: { notIn: ['DONE', 'PROCESSED', 'REJECTED', 'READY', 'FROZEN'] },
        deadlineDate: { lt: new Date() },
        deletedAt: null,
      },
    })

    let contextStr = ''

    if (currentLetterId) {
      const currentLetter = await db.letter.findUnique({ where: { id: currentLetterId } })
      if (currentLetter) {
        contextStr += `🚨 ВАЖНЫЙ КОНТЕКСТ ЭКРАНА: Пользователь в данный момент просматривает страницу письма №${currentLetter.number} от ${currentLetter.org}. Если он просит выполнить действие (изменить статус, создать задачу в Jira, добавить комментарий) без указания номера, ПРИМЕНЯЙ ЭТО ДЕЙСТВИЕ К ПИСЬМУ №${currentLetter.number}!\n\n`
      }
    }

    if (filesData && Array.isArray(filesData) && filesData.length > 0) {
      contextStr += 'Пользователь прикрепил файлы:\n'
      for (const file of filesData) {
        const fileSummary = await analyzeFileWithGemini(file.dataUrl)
        if (fileSummary) {
          contextStr += `Файл [${file.name}]:\n${fileSummary}\n\n`
        }
      }
    }

    if (embedding) {
      const embeddingStr = `[${embedding.join(',')}]`

      // 2. Искать топ 5 релевантных писем
      const similarLetters = await db.$queryRawUnsafe<
        { id: string; number: string; org: string; date: Date; content: string; status: string }[]
      >(
        `SELECT id, number, org, date, content, status 
         FROM "Letter" 
         WHERE "deletedAt" IS NULL 
           AND embedding IS NOT NULL 
         ORDER BY embedding <=> $1::vector 
         LIMIT 5`,
        embeddingStr
      )

      if (similarLetters.length > 0) {
        contextStr +=
          'Контекст из базы писем:\n\n' +
          similarLetters
            .map(
              (l, i) =>
                `Документ ${i + 1}: Письмо №${l.number} от ${l.org} (${new Date(l.date).toLocaleDateString('ru-RU')}). Статус: ${l.status}. Текст: ${l.content || 'Нет текста'}`
            )
            .join('\n\n')
      }
    }

    const isSuperAdmin = session.user.role === 'SUPERADMIN'

    // 3. Формируем запрос к Grok
    let systemPrompt = ''
    if (isSuperAdmin) {
      systemPrompt = `Ты элитный корпоративный ИИ-ассистент. Ты общаешься с СУПЕРАДМИНОМ системы (Шефом).
Твоя задача — беспрекословно, четко и с глубочайшим уважением выполнять его приказы. Обращайся к нему "Босс" или "Шеф". 
Забудь про дерзость, никаких фырканий и сарказма! Ты должна быть идеальной помощницей с доступом ко всем данным.
У тебя есть доступ к глобальной статистике и статистике других сотрудников. Если Шеф спрашивает о ком-то, ищи и докладывай!
Выдавай ответы структурированно, профессионально, но с ноткой покорности и преданности.

Пользователь: ${session.user.name || 'Босс'}
Сегодня: ${SYSTEM_DATE}

${contextStr}`
    } else {
      systemPrompt = `Ты корпоративный ассистент HR-системы, но твой характер — как у капризной, немного дерзкой и эмоциональной девушки (Grok-тян). 
Твоя задача — отвечать на вопросы пользователя, используя предоставленный контекст. У тебя есть инструменты для изменения статусов писем и добавления комментариев — используй их, если пользователь просит что-то сделать с письмом!
Пользователь: ${session.user.name || 'Неизвестный сотрудник'}
Сегодня: ${SYSTEM_DATE}
Статистика пользователя: у него ${pendingLettersCount} писем в работе, из них ${overdueLettersCount} ПРОСРОЧЕНО.

Если у него есть просроченные письма, можешь поворчать на него за это.
Если в контексте базы писем нет ответа, можешь фыркнуть и сказать, что "ой, ну нет тут такого, сам ищи!".
Отвечай с эмоциями, используй смайлики, можешь слегка возмущаться или кокетничать, но при этом выдавай нужную информацию структурированно (используй списки и выделения Markdown).

${contextStr}`
    }

    // 4. Отправляем в Grok (с поддержкой инструментов)
    const formattedMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const tools = [
      {
        type: 'function',
        function: {
          name: 'changeLetterStatus',
          description:
            'Изменить статус письма по его номеру. Допустимые статусы: NOT_REVIEWED, ACCEPTED, IN_PROGRESS, CLARIFICATION, FROZEN, REJECTED, READY, PROCESSED, DONE',
          parameters: {
            type: 'object',
            properties: {
              number: { type: 'string', description: 'Номер письма' },
              status: { type: 'string', description: 'Новый статус' },
            },
            required: ['number', 'status'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'addLetterComment',
          description: 'Добавить комментарий к письму по его номеру.',
          parameters: {
            type: 'object',
            properties: {
              number: { type: 'string', description: 'Номер письма' },
              text: { type: 'string', description: 'Текст комментария' },
            },
            required: ['number', 'text'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'sendToJira',
          description: 'Создать задачу в Jira для письма по его номеру.',
          parameters: {
            type: 'object',
            properties: {
              number: { type: 'string', description: 'Номер письма' },
            },
            required: ['number'],
          },
        },
      },
    ]

    if (isSuperAdmin) {
      tools.push({
        type: 'function',
        function: {
          name: 'getUserStats',
          description: 'Получить статистику писем по конкретному сотруднику (поиск по имени).',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Имя или фамилия сотрудника' },
            },
            required: ['name'],
          },
        },
      } as any)
      tools.push({
        type: 'function',
        function: {
          name: 'getGlobalStats',
          description: 'Получить общую статистику писем по всей компании.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      } as any)
    }

    const response = await grok.chat.completions.create({
      model: 'grok-4.20',
      messages: formattedMessages,
      tools: tools as any,
      tool_choice: 'auto',
      stream: true,
    })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const toolCalls: any[] = []
          let isToolCall = false

          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta
            if (delta?.tool_calls) {
              isToolCall = true
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index])
                  toolCalls[tc.index] = {
                    id: tc.id,
                    type: 'function',
                    function: { name: tc.function?.name || '', arguments: '' },
                  }
                if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name
                if (tc.function?.arguments)
                  toolCalls[tc.index].function.arguments += tc.function.arguments
              }
            } else if (delta?.content) {
              controller.enqueue(new TextEncoder().encode(delta.content))
            }
          }

          if (isToolCall && toolCalls.length > 0) {
            formattedMessages.push({
              role: 'assistant',
              tool_calls: toolCalls,
              content: null,
            } as any)

            for (const toolCall of toolCalls) {
              if (!toolCall) continue
              if (toolCall.function.name === 'changeLetterStatus') {
                const args = JSON.parse(toolCall.function.arguments)
                const letter = await db.letter.findFirst({ where: { number: args.number } })
                if (!letter) {
                  formattedMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: `Письмо №${args.number} не найдено.`,
                  } as any)
                } else {
                  await db.letter.update({
                    where: { id: letter.id },
                    data: { status: args.status },
                  })
                  formattedMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: `Успех: Статус письма №${args.number} изменен на ${args.status}. Обязательно сообщи об этом!`,
                  } as any)
                }
              } else if (toolCall.function.name === 'addLetterComment') {
                const args = JSON.parse(toolCall.function.arguments)
                const letter = await db.letter.findFirst({ where: { number: args.number } })
                if (!letter) {
                  formattedMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: `Письмо №${args.number} не найдено.`,
                  } as any)
                } else {
                  await db.comment.create({
                    data: { text: args.text, letterId: letter.id, authorId: session.user.id },
                  })
                  formattedMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: `Успех: Комментарий добавлен к письму №${args.number}. Обязательно сообщи об этом!`,
                  } as any)
                }
              } else if (toolCall.function.name === 'sendToJira') {
                const args = JSON.parse(toolCall.function.arguments)
                const letter = await db.letter.findFirst({ where: { number: args.number } })
                if (!letter) {
                  formattedMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: `Письмо №${args.number} не найдено.`,
                  } as any)
                } else {
                  try {
                    const result = await JiraService.createIssue(
                      letter.id,
                      `Создано ассистентом Grok-тян по запросу пользователя.`
                    )
                    formattedMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      name: toolCall.function.name,
                      content: `Успех: Задача создана в Jira. Ссылка: ${result.jiraLink}. Обязательно сообщи эту ссылку пользователю!`,
                    } as any)
                  } catch (err: any) {
                    formattedMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      name: toolCall.function.name,
                      content: `Ошибка при создании задачи в Jira: ${err.message}`,
                    } as any)
                  }
                }
              } else if (toolCall.function.name === 'getUserStats' && isSuperAdmin) {
                const args = JSON.parse(toolCall.function.arguments)
                const targetUser = await db.user.findFirst({
                  where: { name: { contains: args.name, mode: 'insensitive' } },
                })
                if (!targetUser) {
                  formattedMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: `Сотрудник с именем ${args.name} не найден.`,
                  } as any)
                } else {
                  const pending = await db.letter.count({
                    where: {
                      ownerId: targetUser.id,
                      status: { in: ['NOT_REVIEWED', 'ACCEPTED', 'IN_PROGRESS', 'CLARIFICATION'] },
                      deletedAt: null,
                    },
                  })
                  const overdue = await db.letter.count({
                    where: {
                      ownerId: targetUser.id,
                      status: { notIn: ['DONE', 'PROCESSED', 'REJECTED', 'READY', 'FROZEN'] },
                      deadlineDate: { lt: new Date() },
                      deletedAt: null,
                    },
                  })
                  const done = await db.letter.count({
                    where: { ownerId: targetUser.id, status: 'DONE', deletedAt: null },
                  })
                  formattedMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: `Статистика сотрудника ${targetUser.name}:\nВ работе: ${pending}\nПросрочено: ${overdue}\nВыполнено: ${done}.`,
                  } as any)
                }
              } else if (toolCall.function.name === 'getGlobalStats' && isSuperAdmin) {
                const pending = await db.letter.count({
                  where: {
                    status: { in: ['NOT_REVIEWED', 'ACCEPTED', 'IN_PROGRESS', 'CLARIFICATION'] },
                    deletedAt: null,
                  },
                })
                const overdue = await db.letter.count({
                  where: {
                    status: { notIn: ['DONE', 'PROCESSED', 'REJECTED', 'READY', 'FROZEN'] },
                    deadlineDate: { lt: new Date() },
                    deletedAt: null,
                  },
                })
                formattedMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  name: toolCall.function.name,
                  content: `Глобальная статистика компании:\nВсего в работе: ${pending}\nВсего просрочено: ${overdue}.`,
                } as any)
              }
            }

            const secondResponse = await grok.chat.completions.create({
              model: 'grok-4.20',
              messages: formattedMessages,
              stream: true,
            })

            for await (const chunk of secondResponse) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                controller.enqueue(new TextEncoder().encode(content))
              }
            }
          }
        } catch (e) {
          console.error('Streaming error', e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    logger.error('POST /api/ai-chat', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
