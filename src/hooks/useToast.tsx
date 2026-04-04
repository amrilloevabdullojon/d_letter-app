'use client'

import { toast as sonnerToast } from 'sonner'
import { useCallback, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastOptions {
  id?: string | number
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toasts: Toast[] // deprecated, kept for compatibility if any code reads it
  addToast: (toast: Omit<Toast, 'id'> & { id?: string | number }) => string | number
  removeToast: (id: string | number) => void
  clearToasts: () => void

  success: (
    title: string,
    messageOrOptions?: string | ToastOptions,
    options?: ToastOptions
  ) => string | number
  error: (
    title: string,
    messageOrOptions?: string | ToastOptions,
    options?: ToastOptions
  ) => string | number
  warning: (
    title: string,
    messageOrOptions?: string | ToastOptions,
    options?: ToastOptions
  ) => string | number
  info: (
    title: string,
    messageOrOptions?: string | ToastOptions,
    options?: ToastOptions
  ) => string | number
  message: (
    title: string,
    messageOrOptions?: string | ToastOptions,
    options?: ToastOptions
  ) => string | number
  loading: (title: string, options?: ToastOptions) => string | number
}

function resolveOptions(
  messageOrOptions?: string | ToastOptions,
  options?: ToastOptions
): { message?: string; options?: ToastOptions } {
  if (typeof messageOrOptions === 'string') {
    return { message: messageOrOptions, options }
  }
  return { message: messageOrOptions?.message, options: messageOrOptions }
}

function buildSonnerOptions(resolved: { message?: string; options?: ToastOptions }) {
  const opts: any = {}
  if (resolved.message) opts.description = resolved.message
  if (resolved.options?.duration) opts.duration = resolved.options.duration
  if (resolved.options?.id) opts.id = resolved.options.id
  if (resolved.options?.action) {
    opts.action = {
      label: resolved.options.action.label,
      onClick: resolved.options.action.onClick,
    }
  }
  return opts
}

export function useToast(): ToastContextValue {
  const [toasts] = useState<Toast[]>([]) // Provide empty array for legacy compatibility

  const addToast = useCallback((toast: Omit<Toast, 'id'> & { id?: string | number }) => {
    const opts = buildSonnerOptions({
      message: toast.message,
      options: { duration: toast.duration, action: toast.action, id: toast.id },
    })
    switch (toast.type) {
      case 'success':
        return sonnerToast.success(toast.title, opts)
      case 'error':
        return sonnerToast.error(toast.title, opts)
      case 'warning':
        return sonnerToast.warning(toast.title, opts)
      case 'info':
        return sonnerToast.info(toast.title, opts)
      case 'loading':
        return sonnerToast.loading(toast.title, opts)
      default:
        return sonnerToast(toast.title, opts)
    }
  }, [])

  const removeToast = useCallback((id: string | number) => sonnerToast.dismiss(id), [])
  const clearToasts = useCallback(() => sonnerToast.dismiss(), [])

  const success = useCallback(
    (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return sonnerToast.success(
        title,
        buildSonnerOptions(resolveOptions(messageOrOptions, options))
      )
    },
    []
  )

  const error = useCallback(
    (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return sonnerToast.error(title, buildSonnerOptions(resolveOptions(messageOrOptions, options)))
    },
    []
  )

  const warning = useCallback(
    (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return sonnerToast.warning(
        title,
        buildSonnerOptions(resolveOptions(messageOrOptions, options))
      )
    },
    []
  )

  const info = useCallback(
    (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return sonnerToast.info(title, buildSonnerOptions(resolveOptions(messageOrOptions, options)))
    },
    []
  )

  const messageFn = useCallback(
    (title: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return sonnerToast(title, buildSonnerOptions(resolveOptions(messageOrOptions, options)))
    },
    []
  )

  const loading = useCallback((title: string, options?: ToastOptions) => {
    return sonnerToast.loading(title, buildSonnerOptions({ options }))
  }, [])

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    message: messageFn,
    loading,
  }
}

// Deprecated legacy exports mapping to dummy to prevent build errors
import { createContext, ReactNode } from 'react'
export const ToastContext = createContext<any>(null)
export function ToastProvider({ children }: { children: ReactNode; value?: any }) {
  return <>{children}</>
}
export function useToastState() {
  return useToast()
}
