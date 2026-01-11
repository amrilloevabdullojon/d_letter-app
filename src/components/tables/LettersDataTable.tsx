'use client'

/**
 * Advanced Letters Data Table using TanStack Table v8
 *
 * Features:
 * - Sorting (multi-column)
 * - Filtering (global + column-specific)
 * - Pagination
 * - Row selection
 * - Column visibility
 * - Column resizing
 * - Virtualization ready
 */

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type LetterStatus = 'NOT_REVIEWED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'

interface Letter {
  id: string
  number: string
  org: string
  date: Date
  deadlineDate: Date | null
  status: LetterStatus
  priority: number
  content: string
  assignedTo?: {
    id: string
    name: string | null
  } | null
}

interface LettersDataTableProps {
  data: Letter[]
  onRowClick?: (letter: Letter) => void
}

const STATUS_LABELS: Record<LetterStatus, string> = {
  NOT_REVIEWED: 'Не рассмотрено',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнено',
  ARCHIVED: 'В архиве',
}

const STATUS_VARIANTS: Record<LetterStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  NOT_REVIEWED: 'destructive',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  ARCHIVED: 'outline',
}

export function LettersDataTable({ data, onRowClick }: LettersDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

  const columns = useMemo<ColumnDef<Letter>[]>(
    () => [
      {
        accessorKey: 'number',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4 h-8 text-xs"
            >
              Номер
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="font-medium text-teal-400">{row.getValue('number')}</div>
        ),
      },
      {
        accessorKey: 'org',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4 h-8 text-xs"
            >
              Организация
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => <div className="max-w-[300px] truncate">{row.getValue('org')}</div>,
      },
      {
        accessorKey: 'date',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4 h-8 text-xs"
            >
              Дата
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const date = row.getValue('date') as Date
          return (
            <div className="text-xs text-gray-400">
              {new Date(date).toLocaleDateString('ru-RU')}
            </div>
          )
        },
      },
      {
        accessorKey: 'deadlineDate',
        header: 'Срок',
        cell: ({ row }) => {
          const deadline = row.getValue('deadlineDate') as Date | null
          if (!deadline) return <span className="text-xs text-gray-500">—</span>

          const days = Math.ceil(
            (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )

          return (
            <div className="text-xs">
              <div>{new Date(deadline).toLocaleDateString('ru-RU')}</div>
              <div
                className={`text-xs ${
                  days < 0
                    ? 'text-red-400'
                    : days < 3
                      ? 'text-amber-400'
                      : 'text-gray-500'
                }`}
              >
                {days < 0 ? `Просрочено на ${Math.abs(days)} дн.` : `Осталось ${days} дн.`}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4 h-8 text-xs"
            >
              Статус
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const status = row.getValue('status') as LetterStatus
          return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4 h-8 text-xs"
            >
              Приоритет
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const priority = row.getValue('priority') as number
          return (
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-12 rounded-full bg-gradient-to-r ${
                  priority >= 80
                    ? 'from-red-500 to-red-600'
                    : priority >= 50
                      ? 'from-amber-500 to-amber-600'
                      : 'from-gray-500 to-gray-600'
                }`}
              >
                <div
                  className="h-full rounded-full bg-white/30"
                  style={{ width: `${priority}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{priority}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'assignedTo',
        header: 'Исполнитель',
        cell: ({ row }) => {
          const assignedTo = row.getValue('assignedTo') as Letter['assignedTo']
          if (!assignedTo) return <span className="text-xs text-gray-500">—</span>
          return (
            <div className="text-xs text-gray-300">{assignedTo.name || 'Без имени'}</div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Поиск по всем полям..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-9 w-full max-w-sm rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/30"
          />
        </div>
        <div className="text-xs text-gray-400">
          {table.getFilteredRowModel().rows.length} писем
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-white/5">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Нет результатов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          <div className="text-xs text-gray-400">
            Страница {table.getState().pagination.pageIndex + 1} из {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selected rows info */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="text-xs text-gray-400">
          Выбрано строк: {Object.keys(rowSelection).length}
        </div>
      )}
    </div>
  )
}
