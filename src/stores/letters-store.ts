/**
 * Letters Store - Zustand store для работы с письмами
 *
 * Используется для:
 * - Управление выбранными письмами (bulk operations)
 * - Фильтры и сортировка
 * - Drag & drop состояние
 * - Временные данные форм (autosave)
 * - Bulk action state
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface LetterDraft {
  number: string
  org: string
  content: string
  [key: string]: unknown
}

type BulkActionType = 'status' | 'owner' | 'delete' | null
type SortField = 'created' | 'deadline' | 'date' | 'number' | 'org' | 'status' | 'priority'
type SortOrder = 'asc' | 'desc'

interface FiltersState {
  search: string
  statusFilter: string
  quickFilter: string
  ownerFilter: string
  typeFilter: string
  sortBy: SortField
  sortOrder: SortOrder
}

const DEFAULT_FILTERS: FiltersState = {
  search: '',
  statusFilter: 'all',
  quickFilter: '',
  ownerFilter: '',
  typeFilter: '',
  sortBy: 'created',
  sortOrder: 'desc',
}

interface LettersState {
  // Selected letters для bulk operations
  selectedLetterIds: Set<string>
  selectLetter: (id: string) => void
  deselectLetter: (id: string) => void
  toggleLetter: (id: string) => void
  toggleSelectAll: (allIds: string[]) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  isSelected: (id: string) => boolean

  // Bulk action
  bulkAction: BulkActionType
  bulkValue: string
  bulkLoading: boolean
  setBulkAction: (action: BulkActionType) => void
  setBulkValue: (value: string) => void
  setBulkLoading: (loading: boolean) => void
  resetBulk: () => void

  // Filters & sorting
  filters: FiltersState
  setSearch: (search: string) => void
  setStatusFilter: (status: string) => void
  setQuickFilter: (filter: string) => void
  setOwnerFilter: (owner: string) => void
  setTypeFilter: (type: string) => void
  setSortBy: (sortBy: SortField) => void
  setSortOrder: (sortOrder: SortOrder) => void
  resetFilters: () => void
  setFilters: (filters: Partial<FiltersState>) => void

  // Drag & Drop
  draggedLetterId: string | null
  setDraggedLetterId: (id: string | null) => void

  // Draft autosave
  letterDraft: LetterDraft | null
  setLetterDraft: (draft: LetterDraft | null) => void
  clearLetterDraft: () => void

  // View mode
  viewMode: 'list' | 'kanban' | 'table'
  setViewMode: (mode: 'list' | 'kanban' | 'table') => void
}

export const useLettersStore = create<LettersState>()(
  devtools(
    (set, get) => ({
      // Selected letters
      selectedLetterIds: new Set(),
      selectLetter: (id) =>
        set((state) => ({
          selectedLetterIds: new Set([...state.selectedLetterIds, id]),
        })),
      deselectLetter: (id) =>
        set((state) => {
          const newSet = new Set(state.selectedLetterIds)
          newSet.delete(id)
          return { selectedLetterIds: newSet }
        }),
      toggleLetter: (id) => {
        const { selectedLetterIds } = get()
        if (selectedLetterIds.has(id)) {
          get().deselectLetter(id)
        } else {
          get().selectLetter(id)
        }
      },
      toggleSelectAll: (allIds) => {
        const { selectedLetterIds } = get()
        if (selectedLetterIds.size === allIds.length) {
          set({ selectedLetterIds: new Set() })
        } else {
          set({ selectedLetterIds: new Set(allIds) })
        }
      },
      selectAll: (ids) =>
        set({
          selectedLetterIds: new Set(ids),
        }),
      clearSelection: () =>
        set({
          selectedLetterIds: new Set(),
        }),
      isSelected: (id) => get().selectedLetterIds.has(id),

      // Bulk action
      bulkAction: null,
      bulkValue: '',
      bulkLoading: false,
      setBulkAction: (action) => set({ bulkAction: action }),
      setBulkValue: (value) => set({ bulkValue: value }),
      setBulkLoading: (loading) => set({ bulkLoading: loading }),
      resetBulk: () =>
        set({
          bulkAction: null,
          bulkValue: '',
          bulkLoading: false,
          selectedLetterIds: new Set(),
        }),

      // Filters & sorting
      filters: { ...DEFAULT_FILTERS },
      setSearch: (search) => set((s) => ({ filters: { ...s.filters, search } })),
      setStatusFilter: (statusFilter) => set((s) => ({ filters: { ...s.filters, statusFilter } })),
      setQuickFilter: (quickFilter) => set((s) => ({ filters: { ...s.filters, quickFilter } })),
      setOwnerFilter: (ownerFilter) => set((s) => ({ filters: { ...s.filters, ownerFilter } })),
      setTypeFilter: (typeFilter) => set((s) => ({ filters: { ...s.filters, typeFilter } })),
      setSortBy: (sortBy) => set((s) => ({ filters: { ...s.filters, sortBy } })),
      setSortOrder: (sortOrder) => set((s) => ({ filters: { ...s.filters, sortOrder } })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
      setFilters: (partial) => set((s) => ({ filters: { ...s.filters, ...partial } })),

      // Drag & Drop
      draggedLetterId: null,
      setDraggedLetterId: (id) => set({ draggedLetterId: id }),

      // Draft
      letterDraft: null,
      setLetterDraft: (draft) => set({ letterDraft: draft }),
      clearLetterDraft: () => set({ letterDraft: null }),

      // View mode
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'letters-store',
    }
  )
)

// Селекторы
export const useSelectedLetterIds = () => useLettersStore((state) => state.selectedLetterIds)
export const useSelectedCount = () => useLettersStore((state) => state.selectedLetterIds.size)
export const useViewMode = () => useLettersStore((state) => state.viewMode)
export const useDraggedLetterId = () => useLettersStore((state) => state.draggedLetterId)
export const useBulkAction = () =>
  useLettersStore((state) => ({
    action: state.bulkAction,
    value: state.bulkValue,
    loading: state.bulkLoading,
  }))
export const useFilters = () => useLettersStore((state) => state.filters)
export const useActiveFiltersCount = () =>
  useLettersStore((state) => {
    const f = state.filters
    let count = 0
    if (f.search) count++
    if (f.statusFilter !== 'all') count++
    if (f.quickFilter) count++
    if (f.ownerFilter) count++
    if (f.typeFilter) count++
    return count
  })

export type { SortField, SortOrder, FiltersState, BulkActionType }
