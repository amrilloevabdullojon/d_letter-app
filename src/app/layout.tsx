import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Snowfall, NewYearBanner } from '@/components/Snowfall'
import { OfflineIndicator } from '@/components/OfflineIndicator'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: '🎄 DMED Letters - С Новым Годом!',
  description: 'Система управления письмами DMED',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        <Providers>
          <NewYearBanner />
          {children}
          <Snowfall />
          <OfflineIndicator />
        </Providers>
      </body>
    </html>
  )
}
