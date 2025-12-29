// Telegram Bot API интеграция

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

interface TelegramResponse {
  ok: boolean
  result?: unknown
  description?: string
}

// Отправить сообщение в Telegram
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not configured')
    return false
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      }
    )

    const data: TelegramResponse = await response.json()

    if (!data.ok) {
      console.error('Telegram API error:', data.description)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return false
  }
}

// Отправить уведомление нескольким пользователям
export async function sendTelegramToMany(
  chatIds: string[],
  text: string
): Promise<number> {
  let sent = 0

  for (const chatId of chatIds) {
    const success = await sendTelegramMessage(chatId, text)
    if (success) sent++
  }

  return sent
}

// Уведомление о новом письме
export function formatNewLetterMessage(letter: {
  number: string
  org: string
  deadline: string
  owner?: string
}): string {
  return `📬 <b>Новое письмо</b>

📋 №${letter.number}
🏢 ${letter.org}
📅 Дедлайн: ${letter.deadline}
👤 Ответственный: ${letter.owner || 'Не назначен'}

🔗 <a href="${process.env.NEXTAUTH_URL}">Открыть в системе</a>`
}

// Уведомление об изменении статуса
export function formatStatusChangeMessage(letter: {
  number: string
  org: string
  oldStatus: string
  newStatus: string
  changedBy: string
}): string {
  return `🔔 <b>Изменение статуса</b>

📋 Письмо №${letter.number} - ${letter.org}

📝 Статус:
Было: ${letter.oldStatus}
Стало: ${letter.newStatus}

👤 Изменил: ${letter.changedBy}`
}

// Уведомление о приближающемся дедлайне
export function formatDeadlineReminderMessage(letter: {
  number: string
  org: string
  deadline: string
  daysLeft: number
  owner?: string
}): string {
  const urgency = letter.daysLeft <= 0
    ? '🔥 ПРОСРОЧЕНО'
    : letter.daysLeft === 1
      ? '⚠️ СРОЧНО'
      : '⏰ НАПОМИНАНИЕ'

  return `${urgency}

📋 Письмо №${letter.number} - ${letter.org}

📅 Дедлайн: ${letter.deadline}
⏱️ ${letter.daysLeft <= 0 ? 'Просрочено на' : 'Осталось'}: ${Math.abs(letter.daysLeft)} дн.

👤 Ответственный: ${letter.owner || 'Не назначен'}`
}

// Уведомление о новом комментарии
export function formatNewCommentMessage(data: {
  letterNumber: string
  letterOrg: string
  author: string
  comment: string
  isMention: boolean
}): string {
  const title = data.isMention
    ? '💬 <b>Вас упомянули в комментарии</b>'
    : '💬 <b>Новый комментарий</b>'

  const preview = data.comment.length > 100
    ? data.comment.substring(0, 100) + '...'
    : data.comment

  return `${title}

📋 Письмо №${data.letterNumber} - ${data.letterOrg}

👤 ${data.author}:
"${preview}"`
}
