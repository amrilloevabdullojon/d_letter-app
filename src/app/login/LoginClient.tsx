'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import Image from 'next/image'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const COUNT = 75
    const MAX_DIST = 130
    const MOUSE_RADIUS = 110

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.45 + 0.25,
    }))

    const onResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (const p of particles) {
        // Mouse repulsion
        const dx = p.x - mx
        const dy = p.y - my
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < MOUSE_RADIUS && d > 0) {
          const force = ((MOUSE_RADIUS - d) / MOUSE_RADIUS) * 0.05
          p.vx += (dx / d) * force
          p.vy += (dy / d) * force
        }

        // Damping + speed cap
        p.vx *= 0.985
        p.vy *= 0.985
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 1.8) {
          p.vx = (p.vx / spd) * 1.8
          p.vy = (p.vy / spd) * 1.8
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) {
          p.x = 0
          p.vx *= -1
        }
        if (p.x > width) {
          p.x = width
          p.vx *= -1
        }
        if (p.y < 0) {
          p.y = 0
          p.vy *= -1
        }
        if (p.y > height) {
          p.y = height
          p.vy *= -1
        }

        // Particle dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(45, 212, 191, ${p.opacity})`
        ctx.fill()
      }

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.2
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // Soft cursor glow
      if (mx > 0 && mx < width) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_RADIUS)
        grad.addColorStop(0, 'rgba(45, 212, 191, 0.07)')
        grad.addColorStop(1, 'rgba(45, 212, 191, 0)')
        ctx.beginPath()
        ctx.arc(mx, my, MOUSE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
  )
}

export default function LoginClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams?.get('next')
  const nextUrl =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('/login') ? rawNext : '/'

  useEffect(() => {
    if (session) {
      router.replace(nextUrl)
    }
  }, [session, router, nextUrl])

  if (status === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-teal-500" />
      </div>
    )
  }

  return (
    <div className="app-shell relative flex min-h-screen items-center justify-center px-4 py-10">
      <ParticleCanvas />

      <div className="panel panel-glass relative z-10 w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
        <div className="relative mx-auto mb-6 h-20 w-20 overflow-hidden rounded-2xl shadow-lg shadow-teal-500/30">
          <Image src="/logo-mark.svg" alt="DMED" fill className="object-contain" priority />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">DMED Letters</h1>
        <p className="mb-8 text-slate-300/80">
          {'Войдите, чтобы работать с письмами, отчётами и контролем исполнения.'}
        </p>

        <button
          onClick={() => signIn('google', { callbackUrl: nextUrl })}
          className="btn-primary inline-flex w-full items-center justify-center gap-3 rounded-lg px-6 py-3"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {'Войти через Google'}
        </button>

        <p className="mt-6 text-xs text-slate-400/80">
          {
            'Используйте рабочий аккаунт DMED. Нужен доступ или это первый запуск системы? Сначала создайте администратора, затем войдите через Google.'
          }
        </p>
      </div>
    </div>
  )
}
