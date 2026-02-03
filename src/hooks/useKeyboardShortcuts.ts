'use client'

import { useEffect, useCallback, useRef } from 'react'

/**
 * Modifier keys
 */
interface Modifiers {
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key to listen for (e.g., 'k', 'Enter', 'Escape') */
  key: string

  /** Modifier keys (object form) */
  modifiers?: Modifiers

  /** Ctrl modifier (flat form) */
  ctrl?: boolean

  /** Alt modifier (flat form) */
  alt?: boolean

  /** Shift modifier (flat form) */
  shift?: boolean

  /** Meta modifier (flat form) */
  meta?: boolean

  /** Callback function */
  handler: (event: KeyboardEvent) => void

  /** Description for help menu */
  description?: string

  /** Prevent default browser behavior */
  preventDefault?: boolean

  /** Only trigger when no input is focused */
  ignoreInputs?: boolean

  /** Enable/disable shortcut */
  enabled?: boolean
}

/**
 * Options for useKeyboardShortcuts
 */
interface UseKeyboardShortcutsOptions {
  /** Global shortcuts (work even when inputs are focused) */
  global?: boolean

  /** Scope element (default: document) */
  scope?: React.RefObject<HTMLElement>
}

/**
 * Check if element is an input
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false
  const tagName = element.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    (element as HTMLElement).isContentEditable
  )
}

/**
 * Check if modifiers match
 */
function checkModifiers(event: KeyboardEvent, modifiers?: Modifiers): boolean {
  const ctrl = modifiers?.ctrl ?? false
  const alt = modifiers?.alt ?? false
  const shift = modifiers?.shift ?? false
  const meta = modifiers?.meta ?? false

  // If no modifiers specified, check that none are pressed
  const noModifiersSpecified = !ctrl && !alt && !shift && !meta
  if (noModifiersSpecified) {
    return !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
  }

  return (
    event.ctrlKey === ctrl &&
    event.altKey === alt &&
    event.shiftKey === shift &&
    event.metaKey === meta
  )
}

/**
 * Normalize key for comparison
 */
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    esc: 'Escape',
    escape: 'Escape',
    enter: 'Enter',
    space: ' ',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    tab: 'Tab',
    delete: 'Delete',
    backspace: 'Backspace',
  }
  return keyMap[key.toLowerCase()] || key
}

/**
 * Hook for handling keyboard shortcuts.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [isSearchOpen, setSearchOpen] = useState(false)
 *
 *   useKeyboardShortcuts([
 *     {
 *       key: 'k',
 *       modifiers: { ctrl: true },
 *       handler: () => setSearchOpen(true),
 *       description: 'Open search',
 *       preventDefault: true
 *     },
 *     {
 *       key: 'Escape',
 *       handler: () => setSearchOpen(false),
 *       description: 'Close search'
 *     },
 *     {
 *       key: 'n',
 *       modifiers: { ctrl: true, shift: true },
 *       handler: () => createNewItem(),
 *       description: 'Create new item',
 *       ignoreInputs: true
 *     }
 *   ])
 * }
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { global = false, scope } = options

  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if we should ignore (input focused)
      const isInput = isInputElement(event.target as Element)

      for (const shortcut of shortcutsRef.current) {
        // Check if shortcut is enabled
        if (shortcut.enabled === false) continue

        // Check if we should ignore inputs
        if (shortcut.ignoreInputs !== false && isInput && !global) continue

        // Check key match
        const normalizedKey = normalizeKey(shortcut.key)
        if (event.key !== normalizedKey && event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
          continue
        }

        // Check modifiers (support both flat and nested forms)
        const modifiers: Modifiers = shortcut.modifiers || {
          ctrl: shortcut.ctrl,
          alt: shortcut.alt,
          shift: shortcut.shift,
          meta: shortcut.meta,
        }
        if (!checkModifiers(event, modifiers)) continue

        // Execute handler
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        shortcut.handler(event)
        break // Only trigger first matching shortcut
      }
    },
    [global]
  )

  useEffect(() => {
    const target = scope?.current || document

    target.addEventListener('keydown', handleKeyDown as EventListener)
    return () => target.removeEventListener('keydown', handleKeyDown as EventListener)
  }, [handleKeyDown, scope])
}

/**
 * Shortcut config for object-style API
 */
interface ShortcutObjectConfig {
  key: string
  handler: (event: KeyboardEvent) => void
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  description?: string
  preventDefault?: boolean
  enabled?: boolean
}

/**
 * Hook for single keyboard shortcut
 *
 * Supports two API styles:
 * 1. Object style: useKeyboardShortcut({ key: 'k', ctrl: true, handler: () => {} })
 * 2. Args style: useKeyboardShortcut('Escape', handler, options)
 *
 * @example
 * ```tsx
 * // Object style (from use-keyboard-shortcuts.ts)
 * useKeyboardShortcut({
 *   key: 'k',
 *   ctrl: true,
 *   handler: () => setSearchOpen(true),
 * })
 *
 * // Args style
 * useKeyboardShortcut('Escape', onClose)
 * ```
 */
export function useKeyboardShortcut(
  keyOrConfig: string | ShortcutObjectConfig,
  handler?: (event: KeyboardEvent) => void,
  options: Omit<KeyboardShortcut, 'key' | 'handler'> & UseKeyboardShortcutsOptions = {}
): void {
  // Object-style API
  if (typeof keyOrConfig === 'object') {
    const config = keyOrConfig
    useKeyboardShortcuts([
      {
        key: config.key,
        handler: config.handler,
        ctrl: config.ctrl,
        alt: config.alt,
        shift: config.shift,
        meta: config.meta,
        description: config.description,
        preventDefault: config.preventDefault,
        enabled: config.enabled,
      },
    ])
    return
  }

  // Args-style API
  const { global, scope, ...shortcutOptions } = options

  useKeyboardShortcuts(
    [
      {
        key: keyOrConfig,
        handler: handler!,
        ...shortcutOptions,
      },
    ],
    { global, scope }
  )
}

/**
 * Hook for arrow key navigation
 *
 * @example
 * ```tsx
 * function List({ items }) {
 *   const [selectedIndex, setSelectedIndex] = useState(0)
 *
 *   useArrowNavigation({
 *     onUp: () => setSelectedIndex(i => Math.max(0, i - 1)),
 *     onDown: () => setSelectedIndex(i => Math.min(items.length - 1, i + 1)),
 *     onEnter: () => selectItem(items[selectedIndex])
 *   })
 * }
 * ```
 */
export function useArrowNavigation(handlers: {
  onUp?: () => void
  onDown?: () => void
  onLeft?: () => void
  onRight?: () => void
  onEnter?: () => void
  onEscape?: () => void
  enabled?: boolean
}): void {
  const { onUp, onDown, onLeft, onRight, onEnter, onEscape, enabled = true } = handlers

  useKeyboardShortcuts(
    [
      { key: 'ArrowUp', handler: () => onUp?.(), enabled: enabled && !!onUp },
      { key: 'ArrowDown', handler: () => onDown?.(), enabled: enabled && !!onDown },
      { key: 'ArrowLeft', handler: () => onLeft?.(), enabled: enabled && !!onLeft },
      { key: 'ArrowRight', handler: () => onRight?.(), enabled: enabled && !!onRight },
      { key: 'Enter', handler: () => onEnter?.(), enabled: enabled && !!onEnter },
      { key: 'Escape', handler: () => onEscape?.(), enabled: enabled && !!onEscape },
    ],
    { global: true }
  )
}

/**
 * Get shortcut display string (for UI)
 *
 * @example
 * getShortcutDisplay({ key: 'k', modifiers: { ctrl: true } }) // 'Ctrl+K'
 */
export function getShortcutDisplay(shortcut: Pick<KeyboardShortcut, 'key' | 'modifiers'>): string {
  const parts: string[] = []

  if (shortcut.modifiers?.ctrl) parts.push('Ctrl')
  if (shortcut.modifiers?.alt) parts.push('Alt')
  if (shortcut.modifiers?.shift) parts.push('Shift')
  if (shortcut.modifiers?.meta) {
    parts.push(typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Win')
  }

  // Capitalize single letter keys
  let key = shortcut.key
  if (key.length === 1) {
    key = key.toUpperCase()
  }

  parts.push(key)

  return parts.join('+')
}

/**
 * Shortcut config for formatShortcut (compatible with use-keyboard-shortcuts API)
 */
interface ShortcutConfig {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
}

/**
 * Format shortcut for display (compatible API)
 *
 * @example
 * formatShortcut({ key: 'k', ctrl: true }) // "Ctrl+K"
 * formatShortcut({ key: 'Enter', shift: true }) // "Shift+Enter"
 */
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = []

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  if (config.ctrl) parts.push(isMac ? '⌃' : 'Ctrl')
  if (config.alt) parts.push(isMac ? '⌥' : 'Alt')
  if (config.shift) parts.push(isMac ? '⇧' : 'Shift')
  if (config.meta) parts.push(isMac ? '⌘' : 'Win')

  const specialKeys: Record<string, string> = {
    escape: 'Esc',
    enter: 'Enter',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    backspace: '⌫',
    delete: 'Del',
    tab: 'Tab',
    ' ': 'Space',
  }

  const key = config.key.toLowerCase()
  parts.push(specialKeys[key] || config.key.toUpperCase())

  return parts.join('+')
}
