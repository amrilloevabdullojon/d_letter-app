'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  /** Показывать ли иконку домика перед первым пунктом */
  showHome?: boolean
  className?: string
}

/**
 * Переиспользуемый breadcrumb-компонент.
 *
 * Пример:
 * ```tsx
 * <Breadcrumb items={[
 *   { label: 'Письма', href: '/letters' },
 *   { label: '#12345' },
 * ]} />
 * ```
 */
export function Breadcrumb({ items, showHome = false, className = '' }: BreadcrumbProps) {
  if (items.length === 0) return null

  const allItems: BreadcrumbItem[] = showHome ? [{ label: 'Главная', href: '/' }, ...items] : items

  return (
    <nav aria-label="Навигационный путь" className={`flex items-center gap-1 text-sm ${className}`}>
      {showHome && (
        <>
          <Link
            href="/"
            className="flex items-center text-slate-500 transition-colors hover:text-slate-300"
            aria-label="Главная"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-700" />
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span key={index} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-slate-400 transition-colors hover:text-slate-200"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? 'font-medium text-slate-200' : 'text-slate-400'}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-700" />}
          </span>
        )
      })}
    </nav>
  )
}
