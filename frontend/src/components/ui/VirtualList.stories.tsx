import type { Meta, StoryObj } from '@storybook/react'
import { useState, useCallback } from 'react'
import { VirtualList, VirtualListDynamic, useVirtualListScroll } from './VirtualList'
import { cn } from '@/lib/utils'

// Generate mock data
interface MockItem {
  id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'closed'
  priority: number
}

function generateMockItems(count: number): MockItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    title: `Issue #${i + 1}: ${['Fix bug', 'Add feature', 'Refactor code', 'Update docs', 'Optimize performance'][i % 5]}`,
    description: `Description for item ${i + 1}. This is some sample text that describes the issue in detail.`,
    status: (['open', 'in_progress', 'closed'] as const)[i % 3],
    priority: (i % 4) + 1,
  }))
}

// Item renderer component
function ItemRow({ item, index }: { item: MockItem; index: number }) {
  const statusColors = {
    open: 'bg-status-open/20 text-status-open',
    in_progress: 'bg-status-in-progress/20 text-status-in-progress',
    closed: 'bg-status-closed/20 text-status-closed',
  }

  return (
    <div
      className={cn(
        'px-3 py-2 mx-1',
        'bg-bg-secondary border border-border rounded-md',
        'hover:bg-bg-tertiary transition-colors',
        'flex items-center justify-between'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-text-muted mono w-8">{index + 1}</span>
        <span className={cn('text-xs px-1.5 py-0.5 rounded', statusColors[item.status])}>
          {item.status}
        </span>
        <span className="text-sm text-text-primary truncate">{item.title}</span>
      </div>
      <span className="text-xs text-text-muted mono">{item.id}</span>
    </div>
  )
}

const meta: Meta<typeof VirtualList<MockItem>> = {
  title: 'UI/VirtualList',
  component: VirtualList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'VirtualList renders only visible items for efficient rendering of large lists (100+ items). Supports fixed-height and dynamic-height items.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-[400px] w-full max-w-2xl bg-bg-primary p-4 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof VirtualList<MockItem>>

/**
 * Default virtual list with 100 items.
 * Only visible items are rendered in the DOM.
 */
export const Default: Story = {
  args: {
    items: generateMockItems(100),
    itemHeight: 48,
    getKey: (item) => item.id,
    className: 'h-full',
  },
  render: (args) => (
    <VirtualList
      {...args}
      renderItem={(item, index) => <ItemRow item={item} index={index} />}
    />
  ),
}

/**
 * Large list with 1000 items demonstrating performance.
 * Scroll quickly to see smooth rendering.
 */
export const LargeList: Story = {
  args: {
    items: generateMockItems(1000),
    itemHeight: 48,
    getKey: (item) => item.id,
    className: 'h-full',
  },
  render: (args) => (
    <VirtualList
      {...args}
      renderItem={(item, index) => <ItemRow item={item} index={index} />}
    />
  ),
}

/**
 * Very large list with 10,000 items.
 * Virtual scrolling keeps performance smooth regardless of list size.
 */
export const HugeList: Story = {
  args: {
    items: generateMockItems(10000),
    itemHeight: 48,
    getKey: (item) => item.id,
    className: 'h-full',
  },
  render: (args) => (
    <VirtualList
      {...args}
      renderItem={(item, index) => <ItemRow item={item} index={index} />}
    />
  ),
}

/**
 * Empty list shows a placeholder message.
 */
export const Empty: Story = {
  args: {
    items: [],
    itemHeight: 48,
    getKey: (item) => item.id,
    className: 'h-full',
  },
  render: (args) => (
    <VirtualList
      {...args}
      renderItem={(item, index) => <ItemRow item={item} index={index} />}
    />
  ),
}

/**
 * Small list that fits in viewport.
 * Works correctly even when all items are visible.
 */
export const SmallList: Story = {
  args: {
    items: generateMockItems(5),
    itemHeight: 48,
    getKey: (item) => item.id,
    className: 'h-full',
  },
  render: (args) => (
    <VirtualList
      {...args}
      renderItem={(item, index) => <ItemRow item={item} index={index} />}
    />
  ),
}

/**
 * Custom overscan value for more pre-rendered items.
 * Higher overscan = smoother scrolling but more DOM nodes.
 */
export const CustomOverscan: Story = {
  args: {
    items: generateMockItems(200),
    itemHeight: 48,
    overscan: 10,
    getKey: (item) => item.id,
    className: 'h-full',
  },
  render: (args) => (
    <VirtualList
      {...args}
      renderItem={(item, index) => <ItemRow item={item} index={index} />}
    />
  ),
}

/**
 * Demonstrates scroll position persistence with useVirtualListScroll hook.
 * Toggle "Unmount" to see scroll position preserved.
 */
export const ScrollPositionPersistence: Story = {
  render: () => {
    const [mounted, setMounted] = useState(true)
    const items = generateMockItems(200)
    const scrollHook = useVirtualListScroll('demo-list')

    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMounted(!mounted)}
            className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-bg-secondary"
          >
            {mounted ? 'Unmount List' : 'Mount List'}
          </button>
          <span className="text-xs text-text-muted">
            Scroll position is preserved when unmounting/remounting
          </span>
        </div>
        <div className="flex-1">
          {mounted ? (
            <VirtualList
              items={items}
              itemHeight={48}
              getKey={(item) => item.id}
              className="h-full"
              onScroll={scrollHook.onScroll}
              initialScrollTop={scrollHook.initialScrollTop}
              renderItem={(item, index) => <ItemRow item={item} index={index} />}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted">
              List unmounted - click button to remount
            </div>
          )}
        </div>
      </div>
    )
  },
}

/**
 * List with data updates while maintaining scroll position.
 */
export const DataUpdates: Story = {
  render: () => {
    const [items, setItems] = useState(() => generateMockItems(100))

    const addItems = useCallback(() => {
      setItems((prev) => [
        ...prev,
        ...generateMockItems(10).map((item, i) => ({
          ...item,
          id: `new-${prev.length + i}`,
          title: `New: ${item.title}`,
        })),
      ])
    }, [])

    const removeItem = useCallback(() => {
      setItems((prev) => prev.slice(0, -1))
    }, [])

    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={addItems}
            className="px-3 py-1 text-sm bg-status-closed/20 text-status-closed border border-status-closed/30 rounded hover:bg-status-closed/30"
          >
            Add 10 Items
          </button>
          <button
            onClick={removeItem}
            className="px-3 py-1 text-sm bg-status-blocked/20 text-status-blocked border border-status-blocked/30 rounded hover:bg-status-blocked/30"
          >
            Remove Last
          </button>
          <span className="text-xs text-text-muted">
            {items.length} items - scroll position maintained on updates
          </span>
        </div>
        <div className="flex-1">
          <VirtualList
            items={items}
            itemHeight={48}
            getKey={(item) => item.id}
            className="h-full"
            renderItem={(item, index) => <ItemRow item={item} index={index} />}
          />
        </div>
      </div>
    )
  },
}

// Dynamic height item renderer
function DynamicItemRow({
  item,
  index,
  measureRef,
}: {
  item: MockItem
  index: number
  measureRef: (el: HTMLElement | null) => void
}) {
  const statusColors = {
    open: 'bg-status-open/20 text-status-open',
    in_progress: 'bg-status-in-progress/20 text-status-in-progress',
    closed: 'bg-status-closed/20 text-status-closed',
  }

  // Vary content length based on index
  const extraLines = index % 5

  return (
    <div
      ref={measureRef}
      className={cn(
        'px-3 py-2 mx-1 mb-1',
        'bg-bg-secondary border border-border rounded-md',
        'hover:bg-bg-tertiary transition-colors'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted mono">{index + 1}</span>
          <span className={cn('text-xs px-1.5 py-0.5 rounded', statusColors[item.status])}>
            {item.status}
          </span>
        </div>
        <span className="text-xs text-text-muted mono">{item.id}</span>
      </div>
      <div className="text-sm text-text-primary">{item.title}</div>
      {extraLines > 0 && (
        <div className="text-xs text-text-secondary mt-1">
          {item.description}
          {extraLines > 1 && <br />}
          {extraLines > 1 && 'Additional context for this item.'}
          {extraLines > 2 && <br />}
          {extraLines > 2 && 'More details that make this item taller.'}
          {extraLines > 3 && <br />}
          {extraLines > 3 && 'Even more information to display.'}
        </div>
      )}
    </div>
  )
}

/**
 * VirtualListDynamic handles items with varying heights.
 * Items are measured as they render for accurate positioning.
 */
export const DynamicHeights: Story = {
  render: () => {
    const items = generateMockItems(200)

    return (
      <VirtualListDynamic
        items={items}
        estimatedItemHeight={60}
        getKey={(item) => item.id}
        className="h-full"
        renderItem={(item, index, measureRef) => (
          <DynamicItemRow item={item} index={index} measureRef={measureRef} />
        )}
      />
    )
  },
}

/**
 * Compact list with smaller item height.
 */
export const CompactList: Story = {
  args: {
    items: generateMockItems(200),
    itemHeight: 32,
    getKey: (item) => item.id,
    className: 'h-full',
  },
  render: (args) => (
    <VirtualList
      {...args}
      renderItem={(item, index) => (
        <div className="px-2 py-1 mx-1 text-sm flex items-center justify-between hover:bg-bg-tertiary rounded">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{index + 1}</span>
            <span className="text-text-primary truncate">{item.title}</span>
          </div>
          <span className="text-xs text-text-muted">{item.status}</span>
        </div>
      )}
    />
  ),
}
