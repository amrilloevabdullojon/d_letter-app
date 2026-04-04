import {
  buildReportPreset,
  defaultReportExportColumns,
  defaultReportViewState,
  normalizeReportPresets,
  normalizeReportViewState,
} from '@/lib/report-presets'

describe('report presets helpers', () => {
  it('falls back to default report view for invalid payloads', () => {
    expect(normalizeReportViewState({ reportView: 'unknown' })).toEqual(defaultReportViewState())
  })

  it('merges export columns with defaults', () => {
    const normalized = normalizeReportViewState({
      ...defaultReportViewState(),
      reportExportColumns: {
        period: false,
        org: true,
        type: false,
        status: true,
        owner: true,
        count: true,
      },
    })

    expect(normalized.reportExportColumns).toEqual({
      ...defaultReportExportColumns(),
      period: false,
      org: true,
      type: false,
      status: true,
      owner: true,
      count: true,
    })
  })

  it('normalizes and sorts valid presets by updatedAt descending', () => {
    const oldPreset = buildReportPreset('Старый вид', defaultReportViewState(), 'preset-1')
    const newPreset = buildReportPreset(
      'Новый вид',
      { ...defaultReportViewState(), reportView: 'table' },
      'preset-2'
    )

    const presets = normalizeReportPresets([
      { ...oldPreset, updatedAt: '2026-04-01T10:00:00.000Z' },
      { ...newPreset, updatedAt: '2026-04-05T10:00:00.000Z' },
      { id: '', name: '', view: null },
    ])

    expect(presets.map((preset) => preset.id)).toEqual(['preset-2', 'preset-1'])
    expect(presets[0]?.view.reportView).toBe('table')
  })
})

export {}
