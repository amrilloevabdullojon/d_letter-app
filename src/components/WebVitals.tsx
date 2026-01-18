'use client'

import { useEffect } from 'react'

export interface Metric {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  entries: PerformanceEntry[]
}

/**
 * Компонент для мониторинга Web Vitals
 * Отслеживает ключевые метрики производительности
 */
export function WebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
      return
    }

    // Динамический импорт web-vitals для production
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
      // CLS - Cumulative Layout Shift
      onCLS((metric) => {
        sendToAnalytics(metric)
      })

      // FID - First Input Delay (deprecated, but still useful)
      onFID((metric) => {
        sendToAnalytics(metric)
      })

      // FCP - First Contentful Paint
      onFCP((metric) => {
        sendToAnalytics(metric)
      })

      // LCP - Largest Contentful Paint
      onLCP((metric) => {
        sendToAnalytics(metric)
      })

      // TTFB - Time to First Byte
      onTTFB((metric) => {
        sendToAnalytics(metric)
      })

      // INP - Interaction to Next Paint (replaces FID)
      onINP((metric) => {
        sendToAnalytics(metric)
      })
    })
  }, [])

  return null
}

/**
 * Отправка метрик на сервер
 */
function sendToAnalytics(metric: Metric) {
  // Формируем данные для отправки
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  })

  // Используем sendBeacon для надежной отправки
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body)
  } else {
    // Fallback на fetch
    fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch((error) => {
      console.error('Failed to send vitals:', error)
    })
  }

  // Логирование в development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
    })
  }
}
