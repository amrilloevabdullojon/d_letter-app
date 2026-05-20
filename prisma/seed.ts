import { PrismaClient, LetterStatus, Role } from '@prisma/client'

const prisma = new PrismaClient()

const ORGS = [
  'Городская клиническая больница №1',
  'Центральная районная больница',
  'Детская поликлиника №5',
  'Областной кардиологический центр',
  'Стоматологическая поликлиника №2',
  'Медицинский центр "Здоровье"',
  'Клинический родильный дом',
  'Научно-исследовательский институт педиатрии',
  'Городская поликлиника №12',
  'Военный госпиталь',
]

const TYPES = [
  'Удаление д-учёта',
  'Удаление диагноза',
  'Изменение диагноза',
  'Исправление персональных данных',
  'Объединение дубликатов карт',
  'Техническая ошибка системы',
  'Права доступа сотрудников',
  'Сброс пароля',
  'Настройка интеграции',
]

const CONTENTS = [
  'Прошу удалить ошибочно поставленный диагноз у пациента. Осмотр проведен некорректно.',
  'Необходимо объединить дубликаты амбулаторных карт пациента в связи с задвоением ПИНФЛ.',
  'Пациент просит снять его с д-учёта по причине выздоровления и изменения группы здоровья.',
  'Ошибка при внесении данных о беременности. Прошу удалить запись в карте.',
  'Запрос на предоставление прав доступа новому врачу-терапевту в модуль ведения приемов.',
  'Не работает интеграция с центральным сервером рецептов. Выдает ошибку 502.',
  'Прошу сбросить пароль пользователя и выслать новые учетные данные.',
  'Некорректная дата рождения в карточке пациента, не удается выписать больничный лист.',
  'Запрос на изменение схемы лечения и добавление препаратов в льготный список.',
]

const ANSWERS = [
  'Диагноз успешно удален из системы. История изменений сохранена в логах.',
  'Амбулаторные карты успешно объединены. ПИНФЛ актуализирован.',
  'Пациент снят с д-учёта на основании предоставленного медицинского заключения.',
  'Запись о беременности удалена. Проверено корректность отображения.',
  'Доступ предоставлен в полном объеме. Пользователь оповещен по email.',
  'Интеграция восстановлена, проведена перезагрузка шлюза обмена данными.',
  'Пароль сброшен. Временные учетные данные отправлены сотруднику.',
  'Персональные данные исправлены. Проблема с больничным листом решена.',
  'Препараты добавлены в льготный перечень согласно регламенту.',
]

async function main() {
  console.log('🌱 Начинается сидирование базы данных...')

  // 1. Очистка старых данных
  console.log('🧹 Очистка старых аналитических данных...')
  await prisma.history.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.file.deleteMany()
  await prisma.letter.deleteMany()
  await prisma.userPreferences.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.user.deleteMany()

  console.log('👤 Сидирование пользователей...')
  const usersData = [
    { name: 'Алексей Иванов', email: 'admin@dmed.ru', role: Role.ADMIN },
    { name: 'Иван Петров', email: 'employee1@dmed.ru', role: Role.EMPLOYEE },
    { name: 'Анна Смирнова', email: 'employee2@dmed.ru', role: Role.EMPLOYEE },
    { name: 'Сергей Сидоров', email: 'employee3@dmed.ru', role: Role.EMPLOYEE },
    { name: 'Екатерина Кузнецова', email: 'employee4@dmed.ru', role: Role.EMPLOYEE },
  ]

  const dbUsers = []
  for (const u of usersData) {
    const dbUser = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        role: u.role,
        canLogin: true,
        preferences: {
          create: {
            theme: 'DARK',
            language: 'ru',
          },
        },
        profile: {
          create: {
            department: 'Отдел обработки обращений',
            position: u.role === Role.ADMIN ? 'Начальник отдела' : 'Специалист поддержки',
          },
        },
      },
    })
    dbUsers.push(dbUser)
  }

  const employees = dbUsers.filter((u) => u.role === Role.EMPLOYEE)

  console.log('✉️ Сидирование писем с историческим распределением...')
  const totalDays = 365
  const lettersToCreate = []
  let letterIndex = 1000

  // Бизнес-часы для пиковых нагрузок создаваемых писем
  const hoursDistribution = [
    0, 0, 1, 1, 2, 6, 7, 8, 9, 10, 10, 10, 11, 11, 11, 12, 12, 13, 14, 14, 15, 15, 15, 16, 16, 16,
    17, 17, 17, 18, 19, 20, 21, 22, 23,
  ]

  const now = new Date()

  for (let d = totalDays; d >= 0; d--) {
    const currentDay = new Date(now)
    currentDay.setDate(now.getDate() - d)
    currentDay.setHours(0, 0, 0, 0)

    const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6

    // Растущий тренд: в начале года меньше писем, к концу больше
    const trendProgress = (totalDays - d) / totalDays
    const baseCount = 2 + trendProgress * 6 // от 2 до 8 писем в день

    // Понижающий коэффициент для выходных (15% от обычной нормы)
    const dayLimit = isWeekend
      ? Math.max(1, Math.floor(baseCount * 0.15))
      : Math.floor(baseCount + (Math.random() * 3 - 1))

    for (let i = 0; i < dayLimit; i++) {
      letterIndex++

      // Генерация времени отправки письма
      const randomHour = hoursDistribution[Math.floor(Math.random() * hoursDistribution.length)]
      const randomMinute = Math.floor(Math.random() * 60)
      const randomSecond = Math.floor(Math.random() * 60)

      const letterDate = new Date(currentDay)
      letterDate.setHours(randomHour, randomMinute, randomSecond)

      // Дедлайн через 3 - 10 дней
      const deadlineDays = Math.floor(Math.random() * 8) + 3
      const deadlineDate = new Date(letterDate)
      deadlineDate.setDate(letterDate.getDate() + deadlineDays)

      // Определение статуса в зависимости от того, насколько письмо старое
      let status: LetterStatus = LetterStatus.DONE
      const ageInDays = d

      if (ageInDays > 30) {
        // Старые письма почти все закрыты
        const rand = Math.random()
        if (rand < 0.8) status = LetterStatus.DONE
        else if (rand < 0.93) status = LetterStatus.PROCESSED
        else if (rand < 0.97) status = LetterStatus.READY
        else if (rand < 0.99) status = LetterStatus.FROZEN
        else status = LetterStatus.REJECTED
      } else {
        // Свежие письма имеют разнообразный статус
        const rand = Math.random()
        if (rand < 0.2) status = LetterStatus.NOT_REVIEWED
        else if (rand < 0.35) status = LetterStatus.ACCEPTED
        else if (rand < 0.55) status = LetterStatus.IN_PROGRESS
        else if (rand < 0.65) status = LetterStatus.CLARIFICATION
        else if (rand < 0.7) status = LetterStatus.FROZEN
        else if (rand < 0.9) status = LetterStatus.DONE
        else status = LetterStatus.PROCESSED
      }

      const isCompleted =
        status === LetterStatus.DONE ||
        status === LetterStatus.READY ||
        status === LetterStatus.PROCESSED
      let closeDate: Date | null = null
      let ijroDate: Date | null = null
      let frozenAt: Date | null = null

      if (isCompleted) {
        // 15% писем нарушают SLA
        const isSlaBreached = Math.random() < 0.15
        closeDate = new Date(letterDate)

        if (isSlaBreached) {
          // Закрыто ПОСЛЕ дедлайна
          const overshootDays = Math.floor(Math.random() * 4) + 1
          closeDate.setDate(deadlineDate.getDate() + overshootDays)
        } else {
          // Закрыто ДО дедлайна
          const solveDays = Math.max(1, Math.floor(Math.random() * deadlineDays))
          closeDate.setDate(letterDate.getDate() + solveDays)
        }

        // Время закрытия в рабочий интервал
        closeDate.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60))
        ijroDate = closeDate
      } else if (status === LetterStatus.FROZEN || status === LetterStatus.REJECTED) {
        frozenAt = new Date(letterDate)
        frozenAt.setDate(letterDate.getDate() + Math.floor(Math.random() * 2))
      }

      const randIndex = Math.floor(Math.random() * CONTENTS.length)
      const org = ORGS[Math.floor(Math.random() * ORGS.length)]
      const type = TYPES[Math.floor(Math.random() * TYPES.length)]
      const content = CONTENTS[randIndex]
      const answer = isCompleted ? ANSWERS[randIndex] : null
      const processing = isCompleted
        ? `Обработано обращение от ${org} по типу "${type}". Запрос закрыт.`
        : null

      const owner = employees[Math.floor(Math.random() * employees.length)]
      const priority = Math.floor(Math.random() * 70) + 20 // 20-90

      lettersToCreate.push({
        number: `DM-2026-${letterIndex}`,
        org,
        type,
        content,
        processing,
        answer,
        date: letterDate,
        deadlineDate,
        closeDate,
        ijroDate,
        frozenAt,
        status,
        priority,
        ownerId: owner.id,
        createdAt: letterDate,
        updatedAt: closeDate || letterDate,
      })
    }
  }

  // Записываем пачками по 100 записей для высокой скорости
  console.log(`📦 Подготовка к записи ${lettersToCreate.length} писем...`)
  const chunkSize = 100
  for (let i = 0; i < lettersToCreate.length; i += chunkSize) {
    const chunk = lettersToCreate.slice(i, i + chunkSize)
    await prisma.letter.createMany({
      data: chunk,
    })
    console.log(
      `✅ Записано писем: ${Math.min(i + chunkSize, lettersToCreate.length)} / ${lettersToCreate.length}`
    )
  }

  console.log('🎉 Сидирование базы данных успешно завершено!')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сидирования:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
