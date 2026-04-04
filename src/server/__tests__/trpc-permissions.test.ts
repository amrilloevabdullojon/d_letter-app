/**
 * @jest-environment node
 */

const mockRolePermissionFindMany = jest.fn()

const mockPrisma = {
  rolePermission: {
    findMany: mockRolePermissionFindMany,
  },
  request: {
    create: jest.fn(),
  },
  requestHistory: {
    create: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown) => value,
    deserialize: (value: unknown) => value,
  },
}))

jest.mock('@/lib/notifications', () => ({
  sendNotification: jest.fn(),
}))

describe('tRPC permission alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRolePermissionFindMany.mockResolvedValue([])
  })

  it('blocks request creation for unauthenticated callers', async () => {
    const { requestsRouter } = await import('@/server/routers/requests')

    const caller = requestsRouter.createCaller({
      session: null,
      prisma: mockPrisma as never,
      req: {} as never,
    })

    await expect(
      caller.create({
        organization: 'Org',
        contactName: 'John',
        contactEmail: 'john@example.com',
        contactPhone: '+123456789',
        contactTelegram: '@john',
        description: 'A sufficiently long request description',
        category: 'OTHER',
      })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('blocks request creation for users without MANAGE_REQUESTS', async () => {
    const { requestsRouter } = await import('@/server/routers/requests')

    const caller = requestsRouter.createCaller({
      session: {
        user: {
          id: 'employee-1',
          role: 'EMPLOYEE',
          name: 'Employee',
          email: 'employee@example.com',
        },
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
      prisma: mockPrisma as never,
      req: {} as never,
    })

    await expect(
      caller.create({
        organization: 'Org',
        contactName: 'John',
        contactEmail: 'john@example.com',
        contactPhone: '+123456789',
        contactTelegram: '@john',
        description: 'A sufficiently long request description',
        category: 'OTHER',
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

export {}
