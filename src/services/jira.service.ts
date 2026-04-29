import { prisma } from '@/lib/prisma'
import { LetterStatus } from '@prisma/client'

export class JiraService {
  /**
   * Получить глобальные настройки Jira
   */
  static async getSettings() {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
    })

    if (!settings || !settings.jiraHost || !settings.jiraEmail || !settings.jiraToken) {
      throw new Error('Jira settings are not configured properly')
    }

    return settings
  }

  /**
   * Отправить задачу в Jira
   */
  static async createIssue(letterId: string, customProcessingText?: string) {
    const settings = await this.getSettings()

    const letter = await prisma.letter.findUnique({
      where: { id: letterId },
    })

    if (!letter) {
      throw new Error('Letter not found')
    }

    const descriptionText = customProcessingText || letter.processing || 'Описание отсутствует'
    const summary = `[${letter.number}] ${letter.org}`

    // Подготовка заголовков для Basic Auth
    const token = Buffer.from(`${settings.jiraEmail}:${settings.jiraToken}`).toString('base64')

    const body = {
      fields: {
        project: {
          key: settings.jiraProjectKey || 'MAIL',
        },
        summary: summary,
        description: descriptionText,
        issuetype: {
          name: 'Task', // По умолчанию Task. В будущем можно вынести в настройки
        },
      },
    }

    const response = await fetch(`${settings.jiraHost}/rest/api/2/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Jira API error:', errorData)
      throw new Error(`Failed to create Jira issue: ${response.statusText}`)
    }

    const data = await response.json()
    const jiraIssueId = data.id
    const jiraKey = data.key
    const jiraLink = `${settings.jiraHost}/browse/${jiraKey}`

    // Обновляем письмо в нашей БД
    await prisma.letter.update({
      where: { id: letterId },
      data: {
        jiraIssueId,
        jiraLink,
        isPendingJira: false,
        ...(customProcessingText ? { processing: customProcessingText } : {}),
      },
    })

    return { jiraIssueId, jiraLink }
  }

  /**
   * Маппинг статусов из Jira (по названию колонки) в наши LetterStatus
   */
  static mapStatus(jiraStatusName: string): LetterStatus {
    const status = jiraStatusName.toLowerCase().trim()

    // 1. Принято (To Do / К выполнению / Needs Approval)
    if (
      status.includes('needs approval') ||
      status.includes('to do') ||
      status.includes('к выполнению') ||
      status.includes('сделать')
    ) {
      return 'ACCEPTED'
    }

    // 2. В работе (In Progress / В работе)
    if (status.includes('in progress') || status.includes('в работе')) {
      return 'IN_PROGRESS'
    }

    // 3. Отклонено (Not Doing / Отклонено / Отменено)
    if (
      status.includes('not doing') ||
      status.includes('отклонен') ||
      status.includes('отменен') ||
      status.includes('cancelled')
    ) {
      return 'REJECTED'
    }

    // 4. Сделано (Done / Выполнено / Закрыто)
    if (
      status.includes('done') ||
      status.includes('выполнен') ||
      status.includes('закрыт') ||
      status.includes('closed')
    ) {
      return 'DONE'
    }

    // 5. На уточнении
    if (status.includes('на уточнении') || status.includes('clarification')) {
      return 'CLARIFICATION'
    }

    // 6. Тестирование / Готово (Testing)
    if (status.includes('testing') || status.includes('тестирован') || status.includes('готово')) {
      return 'READY'
    }

    // По умолчанию возвращаем ACCEPTED (Принят)
    return 'ACCEPTED'
  }

  /**
   * Обработка вебхука от Jira
   */
  static async processWebhook(payload: any) {
    if (!payload || !payload.issue || !payload.issue.id) {
      throw new Error('Invalid Jira webhook payload')
    }

    const jiraIssueId = payload.issue.id

    // Проверяем, изменился ли статус
    let newStatusName = null

    // В Jira webhook, изменения статуса приходят в changelog
    if (payload.changelog && payload.changelog.items) {
      const statusItem = payload.changelog.items.find((item: any) => item.field === 'status')
      if (statusItem) {
        newStatusName = statusItem.toString || statusItem.to
      }
    }

    // Если статус не найден в changelog, берем текущий из полей
    if (!newStatusName && payload.issue.fields && payload.issue.fields.status) {
      newStatusName = payload.issue.fields.status.name
    }

    if (!newStatusName) {
      return { status: 'skipped', reason: 'No status change detected' }
    }

    const letterStatus = this.mapStatus(newStatusName)

    // Ищем письмо с таким jiraIssueId
    const letter = await prisma.letter.findUnique({
      where: { jiraIssueId },
    })

    if (!letter) {
      return { status: 'skipped', reason: 'Letter with given jiraIssueId not found' }
    }

    // Обновляем статус
    await prisma.letter.update({
      where: { id: letter.id },
      data: {
        status: letterStatus,
      },
    })

    return { status: 'success', updatedTo: letterStatus }
  }
}
