import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NotificationsTab } from '@/components/settings/NotificationsTab'
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/notification-settings'

const mockUpdateSettings = jest.fn()

const pushState = {
  subscription: null as PushSubscription | null,
  isSupported: true,
  isSubscribed: false,
  isLoading: false,
  error: null as string | null,
  isConfigured: false,
  canSubscribe: false,
  requestPermission: jest.fn(),
  subscribeToPush: jest.fn(),
  unsubscribeFromPush: jest.fn(),
  checkPermission: jest.fn(),
}

jest.mock('@/hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => ({
    settings: DEFAULT_NOTIFICATION_SETTINGS,
    isLoading: false,
    isSaving: false,
    updateSettings: mockUpdateSettings,
    refetch: jest.fn(),
  }),
}))

jest.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => pushState,
}))

describe('NotificationsTab push settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pushState.subscription = null
    pushState.isSupported = true
    pushState.isSubscribed = false
    pushState.isLoading = false
    pushState.error = null
    pushState.isConfigured = false
    pushState.canSubscribe = false
    pushState.requestPermission.mockResolvedValue(true)
    pushState.subscribeToPush.mockResolvedValue({ endpoint: 'https://push.example.test' })
    pushState.unsubscribeFromPush.mockResolvedValue(true)
    pushState.checkPermission.mockResolvedValue('default')
    mockUpdateSettings.mockResolvedValue(undefined)
  })

  it('disables push toggle and shows config hint when VAPID is not configured', () => {
    render(<NotificationsTab />)

    const pushToggle = screen.getByRole('switch', { name: 'Переключить: Push-уведомления' })
    expect(pushToggle.getAttribute('disabled')).not.toBeNull()
    expect(screen.getByText(/NEXT_PUBLIC_VAPID_PUBLIC_KEY/)).toBeTruthy()
  })

  it('persists pushNotifications only after successful subscription', async () => {
    pushState.isConfigured = true
    pushState.canSubscribe = true

    render(<NotificationsTab />)

    fireEvent.click(screen.getByRole('switch', { name: 'Переключить: Push-уведомления' }))

    await waitFor(() => {
      expect(pushState.requestPermission).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(pushState.subscribeToPush).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ pushNotifications: true })
    })

    expect(pushState.subscribeToPush.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdateSettings.mock.invocationCallOrder[0]
    )
  })
})
