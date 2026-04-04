const mockRolePermissionFindMany = jest.fn()
const originalDatabaseUrl = process.env.DATABASE_URL

jest.mock('@/lib/prisma', () => ({
  prisma: {
    rolePermission: {
      findMany: mockRolePermissionFindMany,
    },
  },
}))

describe('permissions runtime', () => {
  beforeEach(() => {
    jest.resetModules()
    mockRolePermissionFindMany.mockReset()
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  })

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
      return
    }

    process.env.DATABASE_URL = originalDatabaseUrl
  })

  it('respects disabled overrides from the database', async () => {
    mockRolePermissionFindMany.mockResolvedValue([
      {
        role: 'MANAGER',
        permission: 'MANAGE_REQUESTS',
        enabled: false,
      },
    ])

    const permissions = await import('@/lib/permissions')

    expect(await permissions.hasPermissionAsync('MANAGER', 'MANAGE_REQUESTS')).toBe(false)
    expect(permissions.hasPermission('MANAGER', 'MANAGE_REQUESTS')).toBe(false)
    expect(await permissions.hasPermissionAsync('MANAGER', 'VIEW_REQUESTS')).toBe(true)
  })

  it('reloads permissions after cache invalidation', async () => {
    mockRolePermissionFindMany
      .mockResolvedValueOnce([
        {
          role: 'MANAGER',
          permission: 'MANAGE_REQUESTS',
          enabled: false,
        },
      ])
      .mockResolvedValueOnce([])

    const permissions = await import('@/lib/permissions')

    expect(await permissions.hasPermissionAsync('MANAGER', 'MANAGE_REQUESTS')).toBe(false)

    permissions.invalidatePermissionsCache()

    expect(await permissions.hasPermissionAsync('MANAGER', 'MANAGE_REQUESTS')).toBe(true)
  })
})

export {}
