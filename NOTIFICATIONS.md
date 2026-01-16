# Система уведомлений

Документация по настройке и использованию системы уведомлений DMED Letters.

## Обзор улучшений

Система уведомлений была значительно улучшена и теперь включает:

### 1. Web Push-уведомления
- Уведомления в браузере даже когда приложение закрыто
- Service Worker для обработки push-событий
- Автоматическое удаление неактуальных подписок

### 2. Звуковые уведомления
- Разные звуки для разных типов уведомлений
- Web Audio API для генерации звуков
- Настройка включения/выключения

### 3. Email дайджесты
- Ежедневные и еженедельные дайджесты
- Красивые HTML-шаблоны
- Группировка по письмам
- Настройка частоты в профиле

### 4. Batch операции
- Массовое отметка прочитанным
- Удаление по фильтрам
- Операции над выбранными уведомлениями

## Настройка

### 1. Push-уведомления

#### Генерация VAPID ключей

```bash
npm install -g web-push
web-push generate-vapid-keys
```

#### Переменные окружения

Добавьте в `.env`:

```env
# VAPID keys для web push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

#### Установка зависимости

```bash
npm install web-push
```

### 2. Email дайджесты

#### Настройка SMTP (уже есть)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
SMTP_FROM=noreply@example.com
```

#### Настройка Cron jobs

Вам нужно настроить периодический вызов API для отправки дайджестов:

**Для ежедневных дайджестов (каждый день в 9:00):**
```
0 9 * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/digest?type=daily
```

**Для еженедельных дайджестов (каждый понедельник в 9:00):**
```
0 9 * * 1 curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/digest?type=weekly
```

Добавьте секрет в `.env`:
```env
CRON_SECRET=your_random_secret_here
```

#### Альтернатива: Vercel Cron

Если вы используете Vercel, добавьте в `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/digest?type=daily",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/digest?type=weekly",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### 3. База данных

Выполните миграцию для добавления таблицы push subscriptions:

```bash
npx prisma db push
```

Это создаст таблицу `PushSubscription` для хранения подписок пользователей.

## Использование

### Для пользователей

#### 1. Настройка уведомлений

1. Перейдите в **Настройки** → **Уведомления**
2. Выберите каналы уведомлений:
   - Внутри системы (всегда включено)
   - Email
   - Telegram
   - SMS
   - Push-уведомления браузера
3. Настройте типы событий
4. Настройте тихие часы

#### 2. Push-уведомления

1. В настройках включите "Push-уведомления"
2. Браузер запросит разрешение
3. После подтверждения вы будете получать уведомления

#### 3. Email дайджесты

1. В настройках выберите частоту в разделе "Email-уведомления"
2. Доступные варианты:
   - Сразу (мгновенные уведомления)
   - Раз в день
   - Раз в неделю
   - Не отправлять

### Для разработчиков

#### Отправка push-уведомления

```typescript
import { sendPushNotification } from '@/lib/push.server'

await sendPushNotification(userId, {
  title: 'Новое письмо',
  body: 'У вас новое письмо №123',
  icon: '/logo-mark.svg',
  data: {
    url: '/letters/123',
    priority: 'high'
  }
})
```

#### Воспроизведение звука

```typescript
import { playNotificationSound } from '@/lib/sounds'

// Разные типы звуков
await playNotificationSound('default')
await playNotificationSound('success')
await playNotificationSound('warning')
await playNotificationSound('error')
await playNotificationSound('message')
await playNotificationSound('deadline')
```

#### Использование хука push-уведомлений

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications'

function MyComponent() {
  const {
    isSupported,
    isSubscribed,
    subscribeToPush,
    unsubscribeFromPush
  } = usePushNotifications()

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribeFromPush()
    } else {
      await subscribeToPush()
    }
  }

  return (
    <button onClick={handleToggle} disabled={!isSupported}>
      {isSubscribed ? 'Отключить' : 'Включить'} уведомления
    </button>
  )
}
```

## Архитектура

### Компоненты

- `src/components/Notifications.tsx` - главный компонент уведомлений
- `src/components/settings/NotificationsTab.tsx` - настройки уведомлений
- `src/hooks/usePushNotifications.ts` - хук для работы с push

### Серверная часть

- `src/lib/notifications.ts` - отправка email/SMS/Telegram
- `src/lib/push.server.ts` - отправка push-уведомлений
- `src/lib/sounds.ts` - звуковые уведомления (клиент)
- `src/lib/cron/email-digest.ts` - email дайджесты

### API

- `GET/PATCH /api/notifications` - получение и обновление уведомлений
- `POST /api/push/subscribe` - подписка на push
- `POST /api/push/unsubscribe` - отписка от push
- `POST /api/cron/digest` - запуск email дайджестов

### Service Worker

- `public/sw.js` - обработка push-событий и кеширование

## Возможные проблемы

### Push-уведомления не работают

1. Проверьте, что VAPID ключи правильно настроены
2. Убедитесь, что используете HTTPS (localhost тоже работает)
3. Проверьте разрешения браузера
4. Некоторые браузеры (Safari на iOS) не поддерживают Web Push

### Email дайджесты не отправляются

1. Проверьте настройки SMTP
2. Убедитесь, что cron job настроен и запускается
3. Проверьте логи на наличие ошибок
4. Убедитесь, что у пользователей `digestFrequency` не равен `NONE`

### Звуки не проигрываются

1. AudioContext может требовать взаимодействия пользователя
2. Проверьте настройки звука в браузере
3. Убедитесь, что настройка `soundNotifications` включена

## Планы на будущее

- [ ] WebSocket для real-time уведомлений
- [ ] Умная приоритизация уведомлений
- [ ] Многоуровневые напоминания о дедлайнах
- [ ] Аналитика эффективности уведомлений
- [ ] Slack интеграция
- [ ] Microsoft Teams интеграция
- [ ] Webhook система

## Лицензия

Внутренний проект DMED.
