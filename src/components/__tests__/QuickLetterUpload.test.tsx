import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuickLetterUpload } from '@/components/QuickLetterUpload'

const mockPush = jest.fn()

jest.mock('@/components/Toast', () => ({
  useToast: () => ({
    loading: jest.fn(() => 'toast-id'),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    removeToast: jest.fn(),
  }),
}))

jest.mock('@/components/OrganizationAutocomplete', () => ({
  OrganizationAutocomplete: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
  }) => (
    <input
      aria-label="Организация"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
    />
  ),
}))

jest.mock('@/components/OwnerSelector', () => ({
  OwnerSelector: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="owner-selector">{placeholder || 'Выбрать исполнителя'}</div>
  ),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('QuickLetterUpload', () => {
  beforeEach(() => {
    mockPush.mockReset()
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/letters/owners') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            users: [
              { id: 'ck1234567890123456789012', name: 'Исполнитель', email: 'owner@test.local' },
            ],
          }),
        })
      }

      if (url === '/api/parse-pdf') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              number: 'AI-001',
              date: '2026-04-01T00:00:00.000Z',
              deadline: '2026-04-10T00:00:00.000Z',
              organization: 'Минздрав',
              content: 'Краткое содержание',
              contentRussian: 'Полный перевод',
              region: 'Ташкент',
              district: 'Юнусабад',
            },
            meta: { extractedFrom: { ai: true } },
          }),
        })
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    }) as jest.Mock
  })

  it('supports PDF, DOC and DOCX quick parsing and loads owner selection', async () => {
    render(<QuickLetterUpload />)

    const input = screen.getByLabelText('Выбрать файл') as HTMLInputElement

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/letters/owners')
    })

    expect(input.accept).toBe('.pdf,.doc,.docx')
    expect(screen.getByText('PDF, DOC или DOCX')).toBeTruthy()
    expect(
      screen.getByText(/исходный документ будет прикреплён к письму одним серверным запросом/i)
    ).toBeTruthy()

    fireEvent.change(input, {
      target: {
        files: [
          new File(['pdf'], 'letter.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ],
      },
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/parse-pdf',
        expect.objectContaining({ method: 'POST' })
      )
    })

    expect(screen.getByText('Исполнитель')).toBeTruthy()
    expect(screen.getByTestId('owner-selector')).toBeTruthy()
  })
})
