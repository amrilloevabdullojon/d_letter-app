'use client'

import dynamic from 'next/dynamic'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useUserPreferences } from '@/hooks/useUserPreferences'

const Particles = dynamic(() => import('@/components/Particles').then((mod) => mod.Particles), {
  ssr: false,
})
const Snowfall = dynamic(() => import('@/components/Snowfall').then((mod) => mod.Snowfall), {
  ssr: false,
})
const NewYearBanner = dynamic(
  () => import('@/components/Snowfall').then((mod) => mod.NewYearBanner),
  { ssr: false }
)
const OfflineIndicator = dynamic(
  () => import('@/components/OfflineIndicator').then((mod) => mod.OfflineIndicator),
  { ssr: false }
)

export function ClientEffects() {
  const [newYearVibe] = useLocalStorage<boolean>('new-year-vibe', false)
  const { preferences } = useUserPreferences()
  const backgroundAnimations = preferences?.backgroundAnimations ?? false
  const snowfallEnabled = preferences?.snowfall ?? false
  const particlesEnabled = preferences?.particles ?? false
  const showSnowfall = (newYearVibe || snowfallEnabled) && backgroundAnimations
  const showParticles = backgroundAnimations && particlesEnabled

  return (
    <>
      {newYearVibe ? <NewYearBanner /> : null}
      {showParticles ? <Particles /> : null}
      {showSnowfall ? <Snowfall /> : null}
      <OfflineIndicator />
    </>
  )
}
