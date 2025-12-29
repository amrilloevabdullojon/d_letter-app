import { useEffect, useCallback } from 'react'

interface KeyboardShortcuts {
  onUp?: () => void
  onDown?: () => void
  onEnter?: () => void
  onEscape?: () => void
  onSpace?: () => void
  onDelete?: () => void
  onSearch?: () => void // Ctrl+F or /
  onNew?: () => void // N
  onSelectAll?: () => void // Ctrl+A
  enabled?: boolean
}

export function useKeyboard({
  onUp,
  onDown,
  onEnter,
  onEscape,
  onSpace,
  onDelete,
  onSearch,
  onNew,
  onSelectAll,
  enabled = true,
}: KeyboardShortcuts) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Игнорировать если фокус в поле ввода
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Только Escape работает в полях ввода
        if (e.key === 'Escape' && onEscape) {
          e.preventDefault()
          onEscape()
        }
        return
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          if (onDown) {
            e.preventDefault()
            onDown()
          }
          break

        case 'k':
        case 'ArrowUp':
          if (onUp) {
            e.preventDefault()
            onUp()
          }
          break

        case 'Enter':
          if (onEnter) {
            e.preventDefault()
            onEnter()
          }
          break

        case 'Escape':
          if (onEscape) {
            e.preventDefault()
            onEscape()
          }
          break

        case ' ':
          if (onSpace) {
            e.preventDefault()
            onSpace()
          }
          break

        case 'Delete':
        case 'Backspace':
          if (onDelete && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onDelete()
          }
          break

        case '/':
          if (onSearch && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onSearch()
          }
          break

        case 'f':
          if (onSearch && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onSearch()
          }
          break

        case 'n':
          if (onNew && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onNew()
          }
          break

        case 'a':
          if (onSelectAll && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            onSelectAll()
          }
          break
      }
    },
    [enabled, onUp, onDown, onEnter, onEscape, onSpace, onDelete, onSearch, onNew, onSelectAll]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Компонент для отображения подсказок по горячим клавишам
export function KeyboardShortcutsHelp() {
  return (
    <div className="text-xs text-gray-500 space-y-1">
      <div><kbd className="px-1 bg-gray-700 rounded">J</kbd> / <kbd className="px-1 bg-gray-700 rounded">↓</kbd> — Вниз</div>
      <div><kbd className="px-1 bg-gray-700 rounded">K</kbd> / <kbd className="px-1 bg-gray-700 rounded">↑</kbd> — Вверх</div>
      <div><kbd className="px-1 bg-gray-700 rounded">Enter</kbd> — Открыть</div>
      <div><kbd className="px-1 bg-gray-700 rounded">Space</kbd> — Выбрать</div>
      <div><kbd className="px-1 bg-gray-700 rounded">Esc</kbd> — Закрыть/Отмена</div>
      <div><kbd className="px-1 bg-gray-700 rounded">/</kbd> — Поиск</div>
      <div><kbd className="px-1 bg-gray-700 rounded">N</kbd> — Новое письмо</div>
    </div>
  )
}
