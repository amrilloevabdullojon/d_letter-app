import type { LetterStatus } from '@/types/prisma'

export interface CommentAuthor {
  id: string
  name: string | null
  email: string | null
}

export interface CommentItem {
  id: string
  text: string
  createdAt: string
  updatedAt: string
  author: CommentAuthor
  replies?: CommentItem[]
  _count?: {
    replies: number
  }
}

export interface CommentEditItem {
  id: string
  oldText: string
  newText: string
  createdAt: string
  editor: CommentAuthor
}

export interface LetterFile {
  id: string
  name: string
  url: string
  size?: number | null
  mimeType?: string | null
  status?: string | null
  uploadError?: string | null
}

export interface LetterOwner {
  id: string
  name: string | null
  email: string | null
  telegramChatId?: string | null
}

export interface LetterHistoryItem {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: {
    name: string | null
    email: string | null
  }
}

export interface Letter {
  id: string
  number: string
  org: string
  date: string
  deadlineDate: string
  status: LetterStatus
  type: string | null
  content: string | null
  comment: string | null
  contacts: string | null
  applicantName: string | null
  applicantEmail: string | null
  applicantPhone: string | null
  applicantTelegramChatId: string | null
  applicantAccessToken: string | null
  applicantAccessTokenExpiresAt: string | null
  priority: number
  jiraLink: string | null
  zordoc: string | null
  answer: string | null
  sendStatus: string | null
  ijroDate: string | null
  closeDate: string | null
  owner: LetterOwner | null
  files: LetterFile[]
  comments: CommentItem[]
  history: LetterHistoryItem[]
  isWatching: boolean
  isFavorite: boolean
}

export interface NeighborLetter {
  id: string
  number: string
  org: string
}

export interface Neighbors {
  prev?: NeighborLetter
  next?: NeighborLetter
}

export type CommentFilter = 'all' | 'mine'

export interface CommentsState {
  items: CommentItem[]
  page: number
  hasMore: boolean
  total: number | null
  loading: boolean
  error: string | null
}

export interface LetterTab {
  id: 'overview' | 'comments' | 'files' | 'history'
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}
