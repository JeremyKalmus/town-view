import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { cn } from '@/lib/class-utils'

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  allowCreate?: boolean
  className?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  disabled,
  allowCreate = false,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(
    (opt) =>
      !value.includes(opt.value) &&
      opt.label.toLowerCase().includes(inputValue.toLowerCase())
  )

  const showCreateOption =
    allowCreate &&
    inputValue.trim() &&
    !options.some((opt) => opt.label.toLowerCase() === inputValue.toLowerCase()) &&
    !value.includes(inputValue.trim())

  const handleSelect = (optionValue: string) => {
    onChange([...value, optionValue])
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleRemove = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue))
  }

  const handleCreate = () => {
    const newValue = inputValue.trim()
    if (newValue && !value.includes(newValue)) {
      onChange([...value, newValue])
      setInputValue('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value)
      } else if (showCreateOption) {
        handleCreate()
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemove(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const getLabel = (val: string) => {
    const option = options.find((opt) => opt.value === val)
    return option?.label ?? val
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex flex-wrap gap-1 min-h-[36px] w-full rounded-md border bg-bg-secondary px-2 py-1.5',
          'focus-within:ring-2 focus-within:ring-accent-chrome focus-within:ring-offset-2 focus-within:ring-offset-bg-primary',
          'transition-colors',
          error
            ? 'border-status-blocked'
            : 'border-border hover:border-border-accent',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-tertiary text-sm"
          >
            {getLabel(val)}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(val)
                }}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label={`Remove ${getLabel(val)}`}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[60px] bg-transparent text-sm outline-none placeholder:text-text-muted"
          placeholder={value.length === 0 ? placeholder : ''}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>

      {isOpen && (filteredOptions.length > 0 || showCreateOption) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-bg-secondary shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors"
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors text-accent-chrome"
              onClick={handleCreate}
            >
              Create "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
