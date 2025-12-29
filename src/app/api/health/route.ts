import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  checks: {
    database: { status: 'ok' | 'error'; latency?: number; error?: string }
    memory: { status: 'ok' | 'warning'; used: number; total: number; percent: number }
  }
}

// GET /api/health - проверка состояния приложения
export async function GET() {
  const startTime = Date.now()

  const checks: HealthStatus['checks'] = {
    database: { status: 'ok' },
    memory: { status: 'ok', used: 0, total: 0, percent: 0 },
  }

  // Проверка базы данных
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'ok',
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Проверка памяти (только в Node.js)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage()
    const usedMB = Math.round(memory.heapUsed / 1024 / 1024)
    const totalMB = Math.round(memory.heapTotal / 1024 / 1024)
    const percent = Math.round((memory.heapUsed / memory.heapTotal) * 100)

    checks.memory = {
      status: percent > 90 ? 'warning' : 'ok',
      used: usedMB,
      total: totalMB,
      percent,
    }
  }

  // Определяем общий статус
  let status: HealthStatus['status'] = 'healthy'
  if (checks.database.status === 'error') {
    status = 'unhealthy'
  } else if (checks.memory.status === 'warning') {
    status = 'degraded'
  }

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? Math.round(process.uptime()) : 0,
    version: process.env.npm_package_version || '1.0.0',
    checks,
  }

  return NextResponse.json(response, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
