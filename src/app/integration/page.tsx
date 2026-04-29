import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ROLE_HIERARCHY } from '@/lib/constants'
import IntegrationPageClient from './IntegrationPageClient'

export default async function IntegrationPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY['MANAGER']) {
    redirect('/')
  }

  return <IntegrationPageClient />
}
