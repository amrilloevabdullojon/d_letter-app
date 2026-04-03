import { render, screen } from '@testing-library/react'
import { QuickLetterUpload } from '@/components/QuickLetterUpload'

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

describe('QuickLetterUpload', () => {
  it('advertises PDF-only quick AI parsing in the UI', () => {
    render(<QuickLetterUpload />)

    const input = screen.getByLabelText('Выбрать файл') as HTMLInputElement

    expect(input.accept).toBe('.pdf')
    expect(screen.getByText('Только PDF')).toBeTruthy()
    expect(
      screen.getByText(/исходный PDF будет прикреплён к письму одним серверным запросом/i)
    ).toBeTruthy()
  })
})
