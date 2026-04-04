import 'server-only'
import JSZip from 'jszip'

export type SupportedAiDocumentKind = 'pdf' | 'doc' | 'docx'

const DOCX_TEXT_ENTRY_PATTERN =
  /^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/i

const TEXT_RUN_PATTERN = /[\p{L}\p{N}\p{P}\p{Zs}\n\t]{6,}/gu
const MAX_EXTRACTED_TEXT_LENGTH = 20_000

function decodeXmlEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(parseInt(value, 10)))
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function truncateExtractedText(text: string) {
  if (text.length <= MAX_EXTRACTED_TEXT_LENGTH) {
    return text
  }

  return text.slice(0, MAX_EXTRACTED_TEXT_LENGTH).trimEnd()
}

function collectTextRuns(text: string): string[] {
  const matches = text.match(TEXT_RUN_PATTERN) ?? []
  const uniqueRuns = new Set<string>()

  return matches
    .map((match) => normalizeExtractedText(match))
    .filter((match) => match.length >= 12)
    .filter((match) => {
      const key = match.toLowerCase()
      if (uniqueRuns.has(key)) {
        return false
      }
      uniqueRuns.add(key)
      return true
    })
}

function extractTextFromDocxXml(xml: string): string {
  const withBreaks = xml
    .replace(/<w:tab\b[^/]*\/>/gi, '\t')
    .replace(/<w:(?:br|cr)\b[^/]*\/>/gi, '\n')
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<\/w:tr>/gi, '\n')

  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ')
  return normalizeExtractedText(decodeXmlEntities(withoutTags))
}

function decodeWindows1251(buffer: Buffer): string {
  try {
    return new TextDecoder('windows-1251').decode(buffer)
  } catch {
    return buffer.toString('latin1')
  }
}

export function getSupportedAiDocumentKind(
  fileName: string,
  mimeType: string | null | undefined
): SupportedAiDocumentKind | null {
  const normalizedMime = mimeType?.toLowerCase() || ''
  const normalizedName = fileName.toLowerCase()

  if (normalizedName.endsWith('.pdf') || normalizedMime === 'application/pdf') {
    return 'pdf'
  }

  if (
    normalizedName.endsWith('.docx') ||
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }

  if (normalizedName.endsWith('.doc') || normalizedMime === 'application/msword') {
    return 'doc'
  }

  return null
}

export async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string | null> {
  const zip = await JSZip.loadAsync(buffer)
  const documentEntries = Object.keys(zip.files)
    .filter((entryName) => DOCX_TEXT_ENTRY_PATTERN.test(entryName))
    .sort((left, right) => left.localeCompare(right))

  if (documentEntries.length === 0) {
    return null
  }

  const parts = await Promise.all(
    documentEntries.map(async (entryName) => {
      const file = zip.file(entryName)
      if (!file) {
        return ''
      }

      const xml = await file.async('text')
      return extractTextFromDocxXml(xml)
    })
  )

  const text = normalizeExtractedText(parts.filter(Boolean).join('\n\n'))
  return text ? truncateExtractedText(text) : null
}

export function extractTextFromDocBuffer(buffer: Buffer): string | null {
  const candidates = [
    buffer.toString('utf16le'),
    decodeWindows1251(buffer),
    buffer.toString('utf8'),
  ]

  const runs = candidates.flatMap((candidate) => collectTextRuns(candidate))
  if (runs.length === 0) {
    return null
  }

  const text = normalizeExtractedText(runs.join('\n'))
  return text ? truncateExtractedText(text) : null
}

export async function extractTextFromOfficeDocument(
  buffer: Buffer,
  kind: Exclude<SupportedAiDocumentKind, 'pdf'>
): Promise<string | null> {
  if (kind === 'docx') {
    return extractTextFromDocxBuffer(buffer)
  }

  return extractTextFromDocBuffer(buffer)
}
