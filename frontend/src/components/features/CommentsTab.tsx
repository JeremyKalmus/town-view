import { useState } from 'react'
import type { Comment } from '@/types'
import { cn } from '@/lib/class-utils'
import { formatRelativeTime } from '@/lib/status-utils'

interface CommentsTabProps {
  issueId: string
  comments: Comment[]
  isLoading?: boolean
  onAddComment?: (text: string) => void
  isSubmitting?: boolean
  className?: string
}

export function CommentsTab({
  issueId: _issueId,
  comments,
  isLoading = false,
  onAddComment,
  isSubmitting = false,
  className,
}: CommentsTabProps) {
  // _issueId reserved for future CRUD operations (edit/delete comments)
  const [newComment, setNewComment] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim())
      setNewComment('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted text-sm">Loading comments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {comments.length === 0 ? (
          <div className="text-text-muted text-sm text-center py-8">
            No comments yet
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>

      {/* Add comment form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-4 py-3 bg-bg-secondary"
      >
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          disabled={isSubmitting}
          rows={3}
          className={cn(
            'w-full px-3 py-2 rounded-md',
            'bg-bg-primary border border-border',
            'text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
            'resize-none text-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-text-muted">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
          </span>
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-accent text-white',
              'hover:bg-accent/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
}

function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="group">
      {/* Comment header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-text-primary">
          {formatAuthor(comment.author)}
        </span>
        <span className="text-xs text-text-muted">
          {formatRelativeTime(comment.created_at)}
        </span>
      </div>

      {/* Comment body */}
      <div className="text-sm text-text-secondary whitespace-pre-wrap break-words">
        {comment.text}
      </div>
    </div>
  )
}

function formatAuthor(author: string): string {
  // Extract the last part of the path (e.g., "townview/polecats/toast" -> "toast")
  const parts = author.split('/')
  return parts[parts.length - 1] || author
}
