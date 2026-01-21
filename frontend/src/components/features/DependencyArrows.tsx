import { useEffect, useState, useRef } from 'react'
import type { Dependency } from '@/types'

interface NodePosition {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface DependencyArrowsProps {
  dependencies: Dependency[]
  nodeRefs: Map<string, HTMLElement | null>
  containerRef: React.RefObject<HTMLElement>
  visible: boolean
}

/**
 * DependencyArrows renders SVG curved arrows between dependent nodes.
 * Arrows point from the blocker to the blocked issue (from_id blocks to_id).
 */
export function DependencyArrows({
  dependencies,
  nodeRefs,
  containerRef,
  visible,
}: DependencyArrowsProps) {
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map())
  const svgRef = useRef<SVGSVGElement>(null)

  // Update positions when nodes change
  useEffect(() => {
    if (!visible || !containerRef.current) return

    const updatePositions = () => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return

      const newPositions = new Map<string, NodePosition>()

      nodeRefs.forEach((element, id) => {
        if (element) {
          const rect = element.getBoundingClientRect()
          newPositions.set(id, {
            id,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          })
        }
      })

      setPositions(newPositions)
    }

    // Initial update
    updatePositions()

    // Update on scroll and resize
    const container = containerRef.current
    container?.addEventListener('scroll', updatePositions)
    window.addEventListener('resize', updatePositions)

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(updatePositions)
    if (container) {
      resizeObserver.observe(container)
    }

    return () => {
      container?.removeEventListener('scroll', updatePositions)
      window.removeEventListener('resize', updatePositions)
      resizeObserver.disconnect()
    }
  }, [visible, nodeRefs, containerRef])

  if (!visible || dependencies.length === 0) {
    return null
  }

  // Calculate SVG dimensions
  const containerRect = containerRef.current?.getBoundingClientRect()
  const svgWidth = containerRect?.width || 0
  const svgHeight = containerRect?.height || 0

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-10"
      width={svgWidth}
      height={svgHeight}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="currentColor"
            className="text-accent-rust/60"
          />
        </marker>
        <marker
          id="arrowhead-blocked"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="currentColor"
            className="text-status-blocked/60"
          />
        </marker>
      </defs>

      {dependencies.map((dep, index) => {
        const fromPos = positions.get(dep.to_id) // Arrow starts from blocked issue
        const toPos = positions.get(dep.from_id)  // Arrow points to blocker

        if (!fromPos || !toPos) {
          return null
        }

        const path = calculateCurvedPath(fromPos, toPos, index, dependencies.length)
        const isBlockingRelation = dep.type === 'blocks'

        return (
          <path
            key={`${dep.from_id}-${dep.to_id}`}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={isBlockingRelation ? 'none' : '4 2'}
            markerEnd={isBlockingRelation ? 'url(#arrowhead-blocked)' : 'url(#arrowhead)'}
            className={isBlockingRelation ? 'text-status-blocked/40' : 'text-accent-rust/40'}
          />
        )
      })}
    </svg>
  )
}

/**
 * Calculate a curved bezier path between two nodes.
 * Uses quadratic bezier curves with control points offset to avoid overlapping.
 */
function calculateCurvedPath(
  from: NodePosition,
  to: NodePosition,
  index: number,
  _total: number
): string {
  // Calculate start and end points (edge of nodes)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance < 1) {
    return ''
  }

  // Normalize direction
  const nx = dx / distance
  const ny = dy / distance

  // Start from edge of from node, end at edge of to node
  const startX = from.x + nx * (from.width / 2 + 5)
  const startY = from.y + ny * (from.height / 2 + 5)
  const endX = to.x - nx * (to.width / 2 + 15) // Extra space for arrowhead
  const endY = to.y - ny * (to.height / 2 + 15)

  // Calculate control point for curve
  // Offset perpendicular to the line to create curve
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  // Perpendicular offset (alternate sides to reduce overlap)
  const perpOffset = 30 + (index % 3) * 20
  const side = index % 2 === 0 ? 1 : -1

  // Perpendicular vector (rotate 90 degrees)
  const perpX = -ny * perpOffset * side
  const perpY = nx * perpOffset * side

  const controlX = midX + perpX
  const controlY = midY + perpY

  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
}

export default DependencyArrows
