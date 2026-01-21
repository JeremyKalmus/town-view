/**
 * Toast notification component using Radix UI.
 * Provides success/error notifications for issue updates.
 */

import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-status-closed bg-status-closed/10 text-status-closed',
  error: 'border-status-blocked bg-status-blocked/10 text-status-blocked',
  info: 'border-accent-rust bg-accent-rust/10 text-accent-rust',
}

export function Toast({ title, description, variant = 'info', open, onOpenChange }: ToastProps) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'rounded-lg border px-4 py-3 shadow-lg',
        'bg-bg-secondary',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0',
        'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <ToastPrimitive.Title className="font-semibold text-sm">
            {title}
          </ToastPrimitive.Title>
          {description && (
            <ToastPrimitive.Description className="text-xs text-text-secondary mt-1">
              {description}
            </ToastPrimitive.Description>
          )}
        </div>
        <ToastPrimitive.Close
          className="p-1 rounded hover:bg-bg-tertiary transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-text-muted" />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  )
}

export function ToastViewport() {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex flex-col gap-2',
        'max-w-sm w-full',
        'outline-none'
      )}
    />
  )
}

export const ToastProvider = ToastPrimitive.Provider
