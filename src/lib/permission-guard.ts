import { NextResponse } from 'next/server'
import { hasPermission, hasPermissionAsync, type Permission } from '@/lib/permissions'
import type { Role } from '@prisma/client'

export function requirePermission(
  role: Role | null | undefined,
  permission: Permission
): NextResponse<{ error: string }> | null {
  if (hasPermission(role, permission)) {
    return null
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function requirePermissionAsync(
  role: Role | null | undefined,
  permission: Permission
): Promise<NextResponse<{ error: string }> | null> {
  if (await hasPermissionAsync(role, permission)) {
    return null
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
