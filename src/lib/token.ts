import 'server-only'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
} from 'crypto'

const HASHED_TOKEN_PATTERN = /^[a-f0-9]{64}$/i
const TOKEN_ENCRYPTION_PREFIX = 'enc.v1'
const TOKEN_ENCRYPTION_SALT = 'dmed-public-profile-token'

function getTokenEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for token encryption')
  }
  return scryptSync(secret, TOKEN_ENCRYPTION_SALT, 32)
}

function toBase64Url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, 'base64')
}

/**
 * Хеширует токен с помощью SHA-256 для безопасного хранения в БД.
 * Оригинальный токен отправляется пользователю в ссылке,
 * а в БД хранится только хеш — так утечка базы не компрометирует ссылки.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function isHashedTokenValue(token: string | null | undefined): boolean {
  return Boolean(token && HASHED_TOKEN_PATTERN.test(token))
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getTokenEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [TOKEN_ENCRYPTION_PREFIX, toBase64Url(iv), toBase64Url(tag), toBase64Url(encrypted)].join(
    '.'
  )
}

export function decryptToken(payload: string | null | undefined): string | null {
  if (!payload) return null

  const [prefix, ivPart, tagPart, encryptedPart] = payload.split('.')
  if (prefix !== TOKEN_ENCRYPTION_PREFIX || !ivPart || !tagPart || !encryptedPart) {
    return null
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', getTokenEncryptionKey(), fromBase64Url(ivPart))
    decipher.setAuthTag(fromBase64Url(tagPart))

    const decrypted = Buffer.concat([
      decipher.update(fromBase64Url(encryptedPart)),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

export function resolveRawStoredToken(
  storedToken: string | null | undefined,
  encryptedToken: string | null | undefined
): string | null {
  const decrypted = decryptToken(encryptedToken)
  if (decrypted) {
    return decrypted
  }

  if (storedToken && !isHashedTokenValue(storedToken)) {
    return storedToken
  }

  return null
}

export function generateSecureStoredToken(): { raw: string; hashed: string; encrypted: string } {
  const raw = randomUUID()
  return {
    raw,
    hashed: hashToken(raw),
    encrypted: encryptToken(raw),
  }
}

/**
 * Генерирует новый UUID токен и возвращает пару: raw (для ссылки) + hashed (для БД).
 */
export function generatePortalToken(): { raw: string; hashed: string } {
  const raw = randomUUID()
  return { raw, hashed: hashToken(raw) }
}
