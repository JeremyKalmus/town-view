import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/class-utils'

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of each item in pixels (for fixed-height items) */
  itemHeight: number
  /** Function to render each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Optional CSS class name for the container */
  className?: string
  /** Number of items to render above/below the visible area (default: 3) */
  overscan?: number
  /** Unique key extractor for each item */
  getKey?: (item: T, index: number) => string | number
  /** Optional callback when scroll position changes */
  onScroll?: (scrollTop: number) => void
  /** Initial scroll position to restore */
  initialScrollTop?: number
}

/**
 * VirtualList renders only the visible items in a scrollable list,
 * providing smooth performance for lists with 100+ items.
 *
 * Features:
 * - Only renders visible items plus overscan buffer
 * - Smooth scroll behavior
 * - Maintains scroll position on data updates
 * - Supports custom item rendering
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  overscan = 3,
  getKey,
  onScroll,
  initialScrollTop = 0,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(initialScrollTop)
  const [containerHeight, setContainerHeight] = useState(0)

  // Calculate total height of all items
  const totalHeight = items.length * itemHeight

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2)

    return { startIndex, endIndex }
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan])

  // Get visible items with their positions
  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; index: number; top: number }> = []

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i] !== undefined) {
        result.push({
          item: items[i],
          index: i,
          top: i * itemHeight,
        })
      }
    }

    return result
  }, [items, visibleRange, itemHeight])

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop
      setScrollTop(newScrollTop)
      onScroll?.(newScrollTop)
    },
    [onScroll]
  )

  // Measure container height on mount and resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateHeight = () => {
      setContainerHeight(container.clientHeight)
    }

    // Initial measurement
    updateHeight()

    // Set up ResizeObserver for dynamic resize handling
    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Restore scroll position when initialScrollTop changes
  useEffect(() => {
    const container = containerRef.current
    if (container && initialScrollTop !== undefined) {
      container.scrollTop = initialScrollTop
    }
  }, [initialScrollTop])

  // Default key extractor
  const keyExtractor = getKey || ((_, index: number) => index)

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-text-muted', className)}>
        No items to display
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      onScroll={handleScroll}
      style={{ willChange: 'scroll-position' }}
    >
      {/* Spacer div to maintain scroll height */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {/* Render only visible items */}
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Hook to persist and restore scroll position for a VirtualList.
 * Useful when the list re-mounts or data updates.
 */
export function useVirtualListScroll(key: string) {
  const scrollPositions = useRef<Map<string, number>>(new Map())

  const saveScrollPosition = useCallback(
    (scrollTop: number) => {
      scrollPositions.current.set(key, scrollTop)
    },
    [key]
  )

  const getScrollPosition = useCallback(() => {
    return scrollPositions.current.get(key) ?? 0
  }, [key])

  return {
    onScroll: saveScrollPosition,
    initialScrollTop: getScrollPosition(),
  }
}

/**
 * VirtualListWithDynamicHeight supports items with varying heights.
 * Uses estimated heights and measures actual heights as items render.
 */
interface VirtualListDynamicProps<T> {
  /** Array of items to render */
  items: T[]
  /** Estimated height for items (used for initial calculations) */
  estimatedItemHeight: number
  /** Function to render each item */
  renderItem: (item: T, index: number, measureRef: (el: HTMLElement | null) => void) => React.ReactNode
  /** Optional CSS class name for the container */
  className?: string
  /** Number of items to render above/below the visible area (default: 3) */
  overscan?: number
  /** Unique key extractor for each item */
  getKey?: (item: T, index: number) => string | number
}

/**
 * VirtualListDynamic handles variable-height items by measuring them
 * as they render and adjusting positions accordingly.
 */
export function VirtualListDynamic<T>({
  items,
  estimatedItemHeight,
  renderItem,
  className,
  overscan = 3,
  getKey,
}: VirtualListDynamicProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const measuredHeights = useRef<Map<number, number>>(new Map())

  // Calculate item positions based on measured or estimated heights
  const { totalHeight, itemPositions } = useMemo(() => {
    const positions: number[] = []
    let currentTop = 0

    for (let i = 0; i < items.length; i++) {
      positions.push(currentTop)
      const height = measuredHeights.current.get(i) ?? estimatedItemHeight
      currentTop += height
    }

    return { totalHeight: currentTop, itemPositions: positions }
  }, [items.length, estimatedItemHeight])

  // Find visible range using binary search
  const visibleRange = useMemo(() => {
    // Binary search for start index
    let low = 0
    let high = items.length - 1
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      const itemBottom = itemPositions[mid] + (measuredHeights.current.get(mid) ?? estimatedItemHeight)
      if (itemBottom < scrollTop) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    const startIndex = Math.max(0, low - overscan)

    // Find end index
    const viewportBottom = scrollTop + containerHeight
    let endIndex = startIndex
    while (endIndex < items.length && itemPositions[endIndex] < viewportBottom) {
      endIndex++
    }
    endIndex = Math.min(items.length - 1, endIndex + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, containerHeight, items.length, itemPositions, estimatedItemHeight, overscan])

  // Get visible items with their positions
  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; index: number; top: number }> = []

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i] !== undefined) {
        result.push({
          item: items[i],
          index: i,
          top: itemPositions[i],
        })
      }
    }

    return result
  }, [items, visibleRange, itemPositions])

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Measure container height
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateHeight = () => {
      setContainerHeight(container.clientHeight)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Create measurement callback
  const createMeasureRef = useCallback((index: number) => {
    return (el: HTMLElement | null) => {
      if (el) {
        const height = el.getBoundingClientRect().height
        if (measuredHeights.current.get(index) !== height) {
          measuredHeights.current.set(index, height)
        }
      }
    }
  }, [])

  const keyExtractor = getKey || ((_, index: number) => index)

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-text-muted', className)}>
        No items to display
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto', className)}
      onScroll={handleScroll}
      style={{ willChange: 'scroll-position' }}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={keyExtractor(item, index)}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(item, index, createMeasureRef(index))}
          </div>
        ))}
      </div>
    </div>
  )
}
