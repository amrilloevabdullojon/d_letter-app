import { hashToken } from '@/lib/token'

const mockPrisma = {
  userProfile: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/lib/logger.server', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('@/lib/profile-assets', () => ({
  resolveProfileAssetUrl: jest.fn((url: string | null) => url),
}))

describe('SettingsService public profile tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('stores hashed public profile tokens instead of raw values', async () => {
    process.env.NEXTAUTH_SECRET = 'test-secret-with-sufficient-length-1234567890'

    const { SettingsService } = await import('@/services/settings.service')

    const rawToken = await SettingsService.generatePublicProfileToken('user-1')

    const upsertCall = mockPrisma.userProfile.upsert.mock.calls[0]?.[0]
    expect(rawToken).toBeTruthy()
    expect(upsertCall.update.publicProfileToken).toHaveLength(64)
    expect(upsertCall.update.publicProfileToken).not.toBe(rawToken)
    expect(upsertCall.update.publicProfileTokenEncrypted).toBeTruthy()
  })

  it('looks up public profiles by hashed token with legacy fallback', async () => {
    process.env.NEXTAUTH_SECRET = 'test-secret-with-sufficient-length-1234567890'

    const rawToken = '123e4567-e89b-12d3-a456-426614174000'
    mockPrisma.userProfile.findFirst.mockResolvedValue({
      id: 'profile-1',
      bio: 'Visible bio',
      phone: null,
      position: null,
      department: null,
      location: null,
      timezone: null,
      skills: [],
      avatarUrl: null,
      coverUrl: null,
      publicEmail: false,
      publicPhone: false,
      publicBio: true,
      publicPosition: false,
      publicDepartment: false,
      publicLocation: false,
      publicTimezone: false,
      publicSkills: false,
      publicLastLogin: false,
      publicProfileEnabled: true,
      publicProfileToken: hashToken(rawToken),
      publicProfileTokenEncrypted: null,
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      user: {
        id: 'user-1',
        name: 'Visible User',
        email: 'hidden@example.com',
        image: null,
        lastLoginAt: new Date('2026-04-02T00:00:00.000Z'),
      },
    })

    const { SettingsService } = await import('@/services/settings.service')
    const result = await SettingsService.getPublicProfile(rawToken)

    expect(mockPrisma.userProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicProfileEnabled: true,
          OR: [{ publicProfileToken: hashToken(rawToken) }, { publicProfileToken: rawToken }],
        },
      })
    )
    expect(result?.user.name).toBe('Visible User')
    expect(result?.user.email).toBeNull()
    expect(result?.profile.bio).toBe('Visible bio')
  })
})
