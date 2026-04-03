/**
 * tRPC Next.js API Handler
 *
 * Обрабатывает все tRPC запросы через /api/trpc/*
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { NextResponse, type NextRequest } from 'next/server'
import { appRouter } from '@/server/routers/_app'
import { createContext } from '@/server/trpc'
import { isValidCsrfRequest } from '@/lib/security'

const handler = async (req: NextRequest) => {
  if (req.method === 'POST' && !isValidCsrfRequest(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`)
          }
        : undefined,
  })
}

export { handler as GET, handler as POST }
