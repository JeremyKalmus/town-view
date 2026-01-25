import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusDot } from './StatusDot'
import type { AgentState } from '@/types'

describe('StatusDot', () => {
  describe('color classes for agent states', () => {
    const states: AgentState[] = [
      'starting',
      'running',
      'idle',
      'working',
      'stuck',
      'stopping',
      'stopped',
      'paused',
    ]

    it.each(states)('should render appropriate color class for %s state', (state) => {
      render(<StatusDot state={state} />)

      const dot = screen.getByTitle(state)
      expect(dot).toBeInTheDocument()
      // Each state should have a background color class applied
      expect(dot.className).toMatch(/bg-/)
      // Each state should have a text color class applied
      expect(dot.className).toMatch(/text-/)
    })

    it('should render running state with green color', () => {
      render(<StatusDot state="running" />)
      const dot = screen.getByTitle('running')
      expect(dot.className).toContain('text-green-400')
      expect(dot.className).toContain('bg-green-500/20')
    })

    it('should render stuck state with red color', () => {
      render(<StatusDot state="stuck" />)
      const dot = screen.getByTitle('stuck')
      expect(dot.className).toContain('text-red-400')
      expect(dot.className).toContain('bg-red-500/20')
    })

    it('should render idle state with blue color', () => {
      render(<StatusDot state="idle" />)
      const dot = screen.getByTitle('idle')
      expect(dot.className).toContain('text-blue-400')
      expect(dot.className).toContain('bg-blue-500/20')
    })

    it('should render working state with amber color', () => {
      render(<StatusDot state="working" />)
      const dot = screen.getByTitle('working')
      expect(dot.className).toContain('text-amber-400')
      expect(dot.className).toContain('bg-amber-500/20')
    })
  })

  describe('size variants', () => {
    it('should render correct size for sm variant', () => {
      render(<StatusDot state="running" size="sm" />)
      const dot = screen.getByTitle('running')
      expect(dot.className).toContain('w-4')
      expect(dot.className).toContain('h-4')
      expect(dot.className).toContain('text-[10px]')
    })

    it('should render correct size for md variant (default)', () => {
      render(<StatusDot state="running" size="md" />)
      const dot = screen.getByTitle('running')
      expect(dot.className).toContain('w-6')
      expect(dot.className).toContain('h-6')
      expect(dot.className).toContain('text-xs')
    })

    it('should render correct size for lg variant', () => {
      render(<StatusDot state="running" size="lg" />)
      const dot = screen.getByTitle('running')
      expect(dot.className).toContain('w-8')
      expect(dot.className).toContain('h-8')
      expect(dot.className).toContain('text-sm')
    })

    it('should default to md size when size prop is not provided', () => {
      render(<StatusDot state="running" />)
      const dot = screen.getByTitle('running')
      expect(dot.className).toContain('w-6')
      expect(dot.className).toContain('h-6')
    })
  })

  describe('null state (not running)', () => {
    it('should render "not running" state when state is null', () => {
      render(<StatusDot state={null} />)
      const dot = screen.getByTitle('No agent')
      expect(dot).toBeInTheDocument()
    })

    it('should render muted styling for null state', () => {
      render(<StatusDot state={null} />)
      const dot = screen.getByTitle('No agent')
      expect(dot.className).toContain('bg-bg-tertiary')
      expect(dot.className).toContain('text-text-muted')
    })

    it('should respect size prop when state is null', () => {
      render(<StatusDot state={null} size="lg" />)
      const dot = screen.getByTitle('No agent')
      expect(dot.className).toContain('w-8')
      expect(dot.className).toContain('h-8')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<StatusDot state="running" className="my-custom-class" />)
      const dot = screen.getByTitle('running')
      expect(dot.className).toContain('my-custom-class')
      // Should still have default classes
      expect(dot.className).toContain('rounded-full')
    })
  })

  describe('icon rendering', () => {
    it('should render icon for each state', () => {
      const stateIcons: Record<AgentState, string> = {
        starting: '◐',
        running: '●',
        idle: '○',
        working: '◉',
        stuck: '⚠',
        stopping: '◔',
        stopped: '◯',
        paused: '❚❚',
      }

      for (const [state, icon] of Object.entries(stateIcons)) {
        const { unmount } = render(<StatusDot state={state as AgentState} />)
        const dot = screen.getByTitle(state)
        expect(dot.textContent).toBe(icon)
        unmount()
      }
    })

    it('should not render icon when state is null', () => {
      render(<StatusDot state={null} />)
      const dot = screen.getByTitle('No agent')
      expect(dot.textContent).toBe('')
    })
  })
})
