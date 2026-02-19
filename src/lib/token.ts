import { createHash, randomUUID } from 'crypto'

/**
 * Хеширует токен с помощью SHA-256 для безопасного хранения в БД.
 * Оригинальный токен отправляется пользователю в ссылке,
 * а в БД хранится только хеш — так утечка базы не компрометирует ссылки.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Генерирует новый UUID токен и возвращает пару: raw (для ссылки) + hashed (для БД).
 */
export function generatePortalToken(): { raw: string; hashed: string } {
  const raw = randomUUID()
  return { raw, hashed: hashToken(raw) }
}
