'use server'

import { prisma } from '@/lib/prisma'

export async function getPublicAiSettings() {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } })
    return {
      aiEnabled: settings?.aiEnabled ?? true,
      aiChatEnabled: settings?.aiChatEnabled ?? true,
      aiParsingEnabled: settings?.aiParsingEnabled ?? true,
    }
  } catch (error) {
    return {
      aiEnabled: true,
      aiChatEnabled: true,
      aiParsingEnabled: true,
    }
  }
}
