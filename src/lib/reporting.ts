const ORG_ALIASES: Record<string, string> = {
  // Add normalized aliases here, e.g. "gkb 1": "ГКБ 1".
}

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const normalizeOrganization = (value: string | null | undefined) => {
  const trimmed = value?.trim() || ''
  if (!trimmed) return 'Не указано'
  const collapsed = trimmed.replace(/\s+/g, ' ')
  const key = normalizeKey(collapsed)
  return ORG_ALIASES[key] || collapsed
}

export const normalizeLetterType = (value: string | null | undefined) => {
  const trimmed = value?.trim() || ''
  if (!trimmed) return 'Не указано'
  return trimmed.replace(/\s+/g, ' ')
}
