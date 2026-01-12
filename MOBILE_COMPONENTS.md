# 📱 Mobile Components Guide

Руководство по использованию мобильных компонентов и утилит.

## 📦 Компоненты

### 1. MobileOptimizedInput

Мобильно-оптимизированные инпуты с увеличенными touch targets.

```tsx
import { MobileOptimizedInput, MobileOptimizedTextarea, MobileOptimizedSelect } from '@/components/mobile/MobileOptimizedInput'

// Input
<MobileOptimizedInput
  label="Email"
  placeholder="your@email.com"
  error={errors.email}
  helperText="Введите действующий email"
/>

// Textarea
<MobileOptimizedTextarea
  label="Комментарий"
  placeholder="Ваш комментарий..."
  rows={4}
/>

// Select
<MobileOptimizedSelect
  label="Статус"
  options={[
    { value: 'active', label: 'Активный' },
    { value: 'pending', label: 'В ожидании' },
  ]}
/>
```

### 2. MobileDrawer

Выдвижные панели для мобильных устройств.

```tsx
import { MobileDrawer, MobileFilterDrawer } from '@/components/mobile/MobileDrawer'
import { useMobileDrawer } from '@/hooks/useMobileDrawer'

function MyComponent() {
  const drawer = useMobileDrawer()

  return (
    <>
      <button onClick={drawer.open}>Открыть</button>

      <MobileDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.close}
        title="Настройки"
        position="bottom"
      >
        <p>Содержимое drawer...</p>
      </MobileDrawer>
    </>
  )
}

// Filter drawer with actions
;<MobileFilterDrawer
  isOpen={isOpen}
  onClose={handleClose}
  onApply={handleApply}
  onReset={handleReset}
  appliedCount={3}
>
  {/* Filter controls */}
</MobileFilterDrawer>
```

### 3. MobileTabs

Горизонтальные табы с поддержкой badges.

```tsx
import { MobileTabs } from '@/components/mobile/MobileTabs'
import { User, Settings, Bell } from 'lucide-react'

const tabs = [
  {
    id: 'profile',
    label: 'Профиль',
    icon: <User className="h-4 w-4" />,
    content: <ProfileContent />,
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: <Settings className="h-4 w-4" />,
    content: <SettingsContent />,
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    icon: <Bell className="h-4 w-4" />,
    badge: 5,
    content: <NotificationsContent />,
  },
]

<MobileTabs tabs={tabs} defaultTab="profile" />
```

### 4. MobileAccordion

Коллапсируемые секции для группировки контента.

```tsx
import { MobileAccordion } from '@/components/mobile/MobileTabs'

const items = [
  {
    id: '1',
    title: 'Основная информация',
    content: <div>Контент секции 1</div>,
    defaultOpen: true,
  },
  {
    id: '2',
    title: 'Дополнительно',
    content: <div>Контент секции 2</div>,
  },
]

<MobileAccordion items={items} allowMultiple={true} />
```

### 5. ResponsiveChart

Адаптивные графики для мобильных устройств.

```tsx
import { ResponsiveChart } from '@/components/mobile/ResponsiveChart'

;<ResponsiveChart minWidth={180} maxWidth={220} aspectRatio={1}>
  {(size) => <YourChart width={size.width} height={size.height} />}
</ResponsiveChart>

// Для Recharts
import { ResponsiveRecharts } from '@/components/mobile/ResponsiveChart'

;<ResponsiveRecharts minHeight={200} maxHeight={400}>
  {(width, height) => (
    <LineChart width={width} height={height} data={data}>
      {/* ... */}
    </LineChart>
  )}
</ResponsiveRecharts>
```

### 6. ScrollIndicator

Визуальные индикаторы для горизонтальной прокрутки.

```tsx
import { ScrollIndicator } from '@/components/mobile/ScrollIndicator'

;<ScrollIndicator showArrows={true} fadeEdges={true} className="flex gap-2">
  {items.map((item) => (
    <button key={item.id} className="whitespace-nowrap">
      {item.label}
    </button>
  ))}
</ScrollIndicator>
```

### 7. SwipeableCard

Карточки со свайп-жестами для действий.

```tsx
import { SwipeableCard } from '@/components/mobile/SwipeableCard'
import { Trash2, Archive } from 'lucide-react'

;<SwipeableCard
  onSwipeLeft={() => handleDelete(item.id)}
  onSwipeRight={() => handleArchive(item.id)}
  leftAction={{
    icon: Trash2,
    label: 'Удалить',
    color: '#ef4444',
  }}
  rightAction={{
    icon: Archive,
    label: 'В архив',
    color: '#3b82f6',
  }}
  threshold={80}
>
  <div className="card">{/* Ваш контент карточки */}</div>
</SwipeableCard>
```

### 8. StatusBadge (Mobile-optimized)

Улучшенные badges с мобильной оптимизацией.

```tsx
import { StatusBadge } from '@/components/StatusBadge'

// Обычный
<StatusBadge status="IN_PROGRESS" size="md" />

// Мобильно-оптимизированный (больше на mobile, меньше на desktop)
<StatusBadge status="DONE" size="lg" mobileOptimized={true} />

// Компактный
<StatusBadge status="ACCEPTED" size="xs" />
```

---

## 🎣 Hooks

### 1. useIsMobile / useScreenSize

Определение мобильных устройств и размеров экрана.

```tsx
import { useIsMobile, useScreenSize } from '@/hooks/useIsMobile'

function MyComponent() {
  const isMobile = useIsMobile(768) // breakpoint
  const { width, height } = useScreenSize()

  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
      <p>
        Screen: {width}x{height}
      </p>
    </div>
  )
}
```

### 2. useSwipe / useSwipeRef

Обработка свайп-жестов.

```tsx
import { useSwipe, useSwipeRef } from '@/hooks/useSwipe'

// Вариант 1: Использование handlers напрямую
function Component1() {
  const swipeHandlers = useSwipe(
    {
      onSwipeLeft: () => console.log('Swiped left'),
      onSwipeRight: () => console.log('Swiped right'),
    },
    {
      minSwipeDistance: 50,
      maxSwipeTime: 300,
    }
  )

  return <div {...swipeHandlers}>Swipe me!</div>
}

// Вариант 2: Использование ref
function Component2() {
  const swipeRef = useSwipeRef<HTMLDivElement>({
    onSwipeLeft: () => handleNext(),
    onSwipeRight: () => handlePrev(),
  })

  return <div ref={swipeRef}>Swipe me!</div>
}
```

### 3. useLongPress

Обработка длительных нажатий.

```tsx
import { useLongPress } from '@/hooks/useLongPress'
import { hapticLongPressStart, hapticSuccess } from '@/lib/haptic'

function SelectableItem({ item, onSelect }) {
  const { isLongPressing, handlers } = useLongPress({
    delay: 500,
    onStart: () => hapticLongPressStart(),
    onLongPress: () => {
      hapticSuccess()
      onSelect(item.id)
    },
    onCancel: () => console.log('Cancelled'),
    moveThreshold: 10,
  })

  return (
    <div {...handlers} className={isLongPressing ? 'bg-blue-100' : ''}>
      {item.name}
    </div>
  )
}
```

### 4. useMobileDrawer

Управление состоянием drawer.

```tsx
import { useMobileDrawer } from '@/hooks/useMobileDrawer'

function MyComponent() {
  const drawer = useMobileDrawer(false) // initial state

  return (
    <>
      <button onClick={drawer.open}>Открыть</button>
      <button onClick={drawer.toggle}>Переключить</button>

      <MobileDrawer isOpen={drawer.isOpen} onClose={drawer.close}>
        Content
      </MobileDrawer>
    </>
  )
}
```

---

## 🎮 Haptic Feedback

Тактильная обратная связь для мобильных устройств.

```tsx
import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticError,
  hapticWarning,
  hapticImpact,
  hapticSelectionChange,
  hapticLongPressStart,
  isVibrationSupported,
} from '@/lib/haptic'

// Проверка поддержки
if (isVibrationSupported()) {
  console.log('Vibration API supported')
}

// Использование
function Button() {
  const handleClick = () => {
    hapticMedium() // Вибрация при клике
    // Ваша логика...
  }

  return <button onClick={handleClick}>Click me</button>
}

// Примеры для различных сценариев
const handleSuccess = () => {
  hapticSuccess() // Два коротких вибро
  showSuccessToast()
}

const handleError = () => {
  hapticError() // Три коротких вибро
  showErrorToast()
}

const handleSelection = () => {
  hapticSelectionChange() // Очень лёгкая вибрация (5ms)
  setSelected(true)
}

const handleSwipeComplete = () => {
  hapticImpact() // Средняя вибрация (30ms)
  performAction()
}
```

---

## 🎨 CSS Utilities

Tailwind утилиты для мобильных устройств (добавлены в `globals.css`).

### Touch Targets

```tsx
// Минимум 44x44px (Apple HIG)
<button className="touch-target">Button</button>

// Варианты размеров
<button className="touch-target-sm">40x40px</button>
<button className="touch-target">44x44px</button>
<button className="touch-target-lg">48x48px</button>
```

### Tap Highlight

```tsx
// Эффект нажатия (scale-95)
<button className="tap-highlight">Press me</button>

// Убрать браузерный highlight
<div className="no-tap-highlight">No highlight</div>

// Предотвратить text selection
<div className="touch-action-none">No selection</div>
```

### Mobile Scroll

```tsx
// Плавная прокрутка + webkit optimizations
<div className="mobile-scroll overflow-x-auto">
  {/* Scrollable content */}
</div>

// Скрыть scrollbar
<div className="mobile-scroll no-scrollbar">
  {/* Content */}
</div>
```

---

## 📋 Best Practices

### 1. Touch Targets

- Всегда используйте минимум 44x44px для кликабельных элементов
- Добавляйте `.touch-target` к кнопкам и ссылкам
- Используйте `.tap-highlight` для визуального feedback

### 2. Form Inputs

- Используйте `MobileOptimizedInput` вместо обычных input
- Размер шрифта минимум 16px для предотвращения iOS zoom
- Высота инпутов минимум 48px на мобильных

### 3. Navigation

- Используйте `MobileDrawer` для боковых панелей и фильтров
- Применяйте `ScrollIndicator` к горизонтальным спискам
- Добавляйте свайп-жесты через `SwipeableCard` где уместно

### 4. Haptic Feedback

- Используйте haptic для подтверждения действий
- `hapticLight` - для selection/navigation
- `hapticMedium` - для button press
- `hapticSuccess/Error` - для завершения операций
- Не переусердствуйте - haptic должен быть уместным

### 5. Performance

- Используйте `React.memo` для тяжелых компонентов
- Lazy load компоненты через `dynamic()` из next/dynamic
- Применяйте виртуализацию для длинных списков

---

## 🔧 Integration Examples

### Example 1: Letter Card with Swipe Actions

```tsx
import { SwipeableCard } from '@/components/mobile/SwipeableCard'
import { hapticImpact } from '@/lib/haptic'
import { Trash2, Check } from 'lucide-react'

function LetterCard({ letter }) {
  const handleDelete = () => {
    hapticImpact()
    deleteLetter(letter.id)
  }

  const handleMarkDone = () => {
    hapticImpact()
    updateStatus(letter.id, 'DONE')
  }

  return (
    <SwipeableCard
      onSwipeLeft={handleDelete}
      onSwipeRight={handleMarkDone}
      leftAction={{
        icon: Trash2,
        label: 'Удалить',
        color: '#ef4444',
      }}
      rightAction={{
        icon: Check,
        label: 'Выполнено',
        color: '#10b981',
      }}
    >
      <div className="panel panel-glass p-4">
        <h3>{letter.title}</h3>
        <StatusBadge status={letter.status} mobileOptimized />
      </div>
    </SwipeableCard>
  )
}
```

### Example 2: Filter Drawer

```tsx
import { MobileFilterDrawer } from '@/components/mobile/MobileDrawer'
import { MobileOptimizedSelect } from '@/components/mobile/MobileOptimizedInput'
import { useMobileDrawer } from '@/hooks/useMobileDrawer'

function FiltersButton() {
  const drawer = useMobileDrawer()
  const [filters, setFilters] = useState({
    status: 'all',
    owner: 'all',
  })

  const handleApply = () => {
    applyFilters(filters)
    drawer.close()
  }

  const handleReset = () => {
    setFilters({ status: 'all', owner: 'all' })
  }

  return (
    <>
      <button onClick={drawer.open} className="touch-target tap-highlight">
        Фильтры
      </button>

      <MobileFilterDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.close}
        onApply={handleApply}
        onReset={handleReset}
        appliedCount={Object.values(filters).filter((v) => v !== 'all').length}
      >
        <MobileOptimizedSelect
          label="Статус"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          options={statusOptions}
        />
        <MobileOptimizedSelect
          label="Исполнитель"
          value={filters.owner}
          onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value }))}
          options={ownerOptions}
        />
      </MobileFilterDrawer>
    </>
  )
}
```

### Example 3: Long Press for Bulk Selection

```tsx
import { useLongPress } from '@/hooks/useLongPress'
import { hapticLongPressStart, hapticLight } from '@/lib/haptic'

function SelectableLetterList({ letters }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  const toggleSelection = (id: string) => {
    hapticLight()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div>
      {letters.map((letter) => (
        <LetterItem
          key={letter.id}
          letter={letter}
          isSelected={selectedIds.has(letter.id)}
          selectionMode={selectionMode}
          onSelect={() => toggleSelection(letter.id)}
          onEnterSelectionMode={() => {
            hapticLongPressStart()
            setSelectionMode(true)
            toggleSelection(letter.id)
          }}
        />
      ))}
    </div>
  )
}

function LetterItem({ letter, isSelected, selectionMode, onSelect, onEnterSelectionMode }) {
  const longPress = useLongPress({
    delay: 500,
    onLongPress: onEnterSelectionMode,
    moveThreshold: 10,
  })

  const handleClick = () => {
    if (selectionMode) {
      onSelect()
    } else {
      // Navigate to letter detail
    }
  }

  return (
    <div
      {...(!selectionMode ? longPress.handlers : {})}
      onClick={handleClick}
      className={cn(
        'panel panel-glass p-4 transition',
        isSelected && 'ring-2 ring-emerald-500',
        longPress.isLongPressing && 'scale-95'
      )}
    >
      {/* Letter content */}
    </div>
  )
}
```

---

## 📱 Responsive Breakpoints

```tsx
// Tailwind breakpoints используемые в компонентах:
sm: 640px   // Small devices
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops
```

## ✅ Checklist для мобильной оптимизации

- [ ] Touch targets минимум 44x44px
- [ ] Input font-size минимум 16px (предотвращает iOS zoom)
- [ ] Haptic feedback на ключевых действиях
- [ ] Swipe gestures для часто используемых действий
- [ ] Long-press для массовых операций
- [ ] Scroll indicators на горизонтальных списках
- [ ] Adaptive charts для графиков
- [ ] Mobile drawers вместо modals на маленьких экранах
- [ ] Safe area insets для notched devices
- [ ] Prevent zoom on double-tap где нужно

---

Готово! 🎉 Все компоненты готовы к использованию и полностью типизированы.
