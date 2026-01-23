import type { LucideIcon } from 'lucide-react'

export interface RecentItem {
  id: string
  label: string
  href: string
  kind: 'letter' | 'request'
  ts: number
  resolved?: boolean
  subtitle?: string
}

export interface QuickCreateItem {
  href: string
  label: string
  icon: LucideIcon
  iconClassName: string
}

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  matchPath: string | ((pathname: string) => boolean)
}

export interface PageMeta {
  label: string
  icon: LucideIcon
}

export interface PrimaryAction {
  href: string
  label: string
  icon: LucideIcon
}

export type SyncDirection = 'to_sheets' | 'from_sheets'
