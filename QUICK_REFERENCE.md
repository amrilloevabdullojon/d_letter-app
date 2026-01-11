# ⚡ Quick Reference - Новые технологии

## tRPC - Type-safe API

### Создание endpoint

```tsx
// server/routers/myRouter.ts
export const myRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.myModel.findUnique({
        where: { id: input.id }
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({ name: z.string() })
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.myModel.update({
        where: { id: input.id },
        data: input.data
      })
    })
})
```

### Использование в компоненте

```tsx
'use client'
import { trpc } from '@/lib/trpc'

export function MyComponent() {
  // Query
  const { data, isLoading } = trpc.my.getById.useQuery({
    id: '123'
  })

  // Mutation
  const updateMutation = trpc.my.update.useMutation({
    onSuccess: () => console.log('Updated!'),
    onError: (error) => console.error(error)
  })

  const handleUpdate = () => {
    updateMutation.mutate({
      id: '123',
      data: { name: 'New Name' }
    })
  }

  return <div>{data?.name}</div>
}
```

---

## React Hook Form + Zod

### Создание формы

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Schema
const formSchema = z.object({
  email: z.string().email('Некорректный email'),
  name: z.string().min(1, 'Имя обязательно'),
  age: z.number().min(18, 'Минимум 18 лет')
})

type FormData = z.infer<typeof formSchema>

export function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange' // real-time validation
  })

  const onSubmit = (data: FormData) => {
    console.log(data)
    reset() // Clear form
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}

      <input {...register('name')} />
      {errors.name && <p>{errors.name.message}</p>}

      <button type="submit" disabled={!isValid}>
        Submit
      </button>
    </form>
  )
}
```

### Advanced: Conditional validation

```tsx
const schema = z.object({
  hasAddress: z.boolean(),
  address: z.string().optional()
}).refine((data) => {
  if (data.hasAddress) {
    return data.address && data.address.length > 0
  }
  return true
}, {
  message: 'Address is required',
  path: ['address']
})
```

---

## TanStack Table

### Простая таблица

```tsx
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'

const columns = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'email',
    header: 'Email'
  }
]

export function SimpleTable({ data }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext()
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### С сортировкой и фильтрацией

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel
} from '@tanstack/react-table'

const [sorting, setSorting] = useState([])
const [globalFilter, setGlobalFilter] = useState('')

const table = useReactTable({
  data,
  columns,
  state: { sorting, globalFilter },
  onSortingChange: setSorting,
  onGlobalFilterChange: setGlobalFilter,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel()
})

// Сортировка по клику
<th onClick={() => column.toggleSorting()}>
  {header}
  {column.getIsSorted() && (column.getIsSorted() === 'asc' ? '↑' : '↓')}
</th>

// Глобальный поиск
<input
  value={globalFilter}
  onChange={e => setGlobalFilter(e.target.value)}
  placeholder="Search..."
/>

// Пагинация
<button onClick={() => table.previousPage()}>Previous</button>
<button onClick={() => table.nextPage()}>Next</button>
```

---

## Zustand Store

### Простой store

```tsx
import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}))

// Использование
function Counter() {
  const { count, increment } = useCounterStore()
  return <button onClick={increment}>{count}</button>
}
```

### С persist (localStorage)

```tsx
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user })
    }),
    {
      name: 'user-storage' // localStorage key
    }
  )
)
```

### С immer (иммутабельность)

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const useStore = create(
  immer((set) => ({
    todos: [],
    addTodo: (text) =>
      set((state) => {
        state.todos.push({ id: Date.now(), text })
      })
  }))
)
```

---

## Optimistic Updates

### Setup

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const useStore = create(
  immer((set, get) => ({
    items: new Map(),
    pendingUpdates: new Map(),

    optimisticUpdate: (id, newData) =>
      set((state) => {
        const item = state.items.get(id)
        const updateId = `${id}-${Date.now()}`

        // Save original
        state.pendingUpdates.set(updateId, {
          id,
          original: item
        })

        // Update immediately
        state.items.set(id, { ...item, ...newData })
      }),

    confirmUpdate: (updateId) =>
      set((state) => {
        state.pendingUpdates.delete(updateId)
      }),

    rollbackUpdate: (updateId) =>
      set((state) => {
        const update = state.pendingUpdates.get(updateId)
        if (update) {
          state.items.set(update.id, update.original)
          state.pendingUpdates.delete(updateId)
        }
      })
  }))
)
```

### Использование

```tsx
const { optimisticUpdate, confirmUpdate, rollbackUpdate } = useStore()

const handleUpdate = async (id, newData) => {
  const updateId = `${id}-${Date.now()}`

  // UI обновляется мгновенно
  optimisticUpdate(id, newData)

  try {
    await api.update(id, newData)
    confirmUpdate(updateId) // Success
  } catch (error) {
    rollbackUpdate(updateId) // Rollback
    toast.error('Failed to update')
  }
}
```

---

## shadcn/ui Components

### Button

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Form с React Hook Form

```tsx
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>Your email</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

---

## Полезные паттерны

### Loading States

```tsx
const { data, isLoading, error } = trpc.my.getAll.useQuery()

if (isLoading) return <Spinner />
if (error) return <Error message={error.message} />
return <div>{data.map(...)}</div>
```

### Debounced Search

```tsx
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const [search, setSearch] = useState('')
const debouncedSearch = useDebouncedValue(search, 300)

const { data } = trpc.my.search.useQuery({
  query: debouncedSearch
})
```

### Infinite Scroll

```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = trpc.my.getAll.useInfiniteQuery(
  { limit: 20 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor
  }
)

<InfiniteScroll onLoadMore={fetchNextPage}>
  {data?.pages.flatMap(page => page.items).map(...)}
</InfiniteScroll>
```

---

## Debug Tools

### React Query DevTools

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<TRPCProvider>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</TRPCProvider>
```

### Redux DevTools (Zustand)

```tsx
import { devtools } from 'zustand/middleware'

export const useStore = create(
  devtools((set) => ({
    // state
  }), {
    name: 'my-store'
  })
)
```

---

## Performance Tips

1. **Мемоизация колонок таблицы**
```tsx
const columns = useMemo(() => [...], [])
```

2. **Селекторы для Zustand**
```tsx
const count = useStore(state => state.count) // Only re-renders when count changes
```

3. **React Hook Form mode**
```tsx
useForm({ mode: 'onBlur' }) // Less validation, better performance
```

4. **TanStack Table pagination**
```tsx
initialState: { pagination: { pageSize: 10 } }
```

---

**Полная документация:** `/demo` или `MODERNIZATION_COMPLETE.md`
