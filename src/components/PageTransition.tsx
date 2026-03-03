'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUserPreferences } from '@/hooks/useUserPreferences'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const { preferences } = useUserPreferences()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'fadeOut' | 'none'>('none')
  const [barProgress, setBarProgress] = useState(0)
  const [barVisible, setBarVisible] = useState(false)

  const pageTransitionsEnabled = preferences?.pageTransitions ?? true
  const animationsEnabled = preferences?.animations ?? true

  useEffect(() => {
    // Если анимации отключены, сразу показываем контент
    if (!pageTransitionsEnabled || !animationsEnabled) {
      setDisplayChildren(children)
      setTransitionStage('none')
      return
    }

    // Запускаем анимацию выхода при изменении pathname
    setTransitionStage('fadeOut')
  }, [pathname, pageTransitionsEnabled, animationsEnabled])

  useEffect(() => {
    if (transitionStage === 'fadeOut') {
      // Показываем progress bar, быстро заполняем до 70%
      setBarProgress(0)
      setBarVisible(true)
      const fillTimer = setTimeout(() => setBarProgress(70), 20)

      // После завершения fadeOut обновляем контент и запускаем fadeIn
      const timeout = setTimeout(() => {
        setDisplayChildren(children)
        setTransitionStage('fadeIn')
      }, 150) // Длительность fadeOut

      return () => {
        clearTimeout(fillTimer)
        clearTimeout(timeout)
      }
    } else if (transitionStage === 'fadeIn') {
      // Заполняем до 100% и скрываем бар
      setBarProgress(100)

      const timeout = setTimeout(() => {
        setTransitionStage('none')
        setBarVisible(false)
        setBarProgress(0)
      }, 300)

      return () => clearTimeout(timeout)
    }
  }, [transitionStage, children])

  // Если анимации отключены, возвращаем контент без обёртки
  if (!pageTransitionsEnabled || !animationsEnabled) {
    return <>{children}</>
  }

  return (
    <>
      {/* Top progress bar */}
      {barVisible && (
        <div
          className="fixed left-0 top-0 z-[9999] h-[2px] bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.7)] transition-all ease-out"
          style={{
            width: `${barProgress}%`,
            transitionDuration: barProgress === 70 ? '120ms' : '100ms',
            opacity: barProgress === 100 ? 0 : 1,
          }}
        />
      )}

      <div
        className={`transition-opacity duration-150 ease-out ${
          transitionStage === 'fadeOut'
            ? 'opacity-0'
            : transitionStage === 'fadeIn'
              ? 'animate-fadeIn'
              : 'opacity-100'
        }`}
      >
        {displayChildren}
      </div>
    </>
  )
}
