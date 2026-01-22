import { useState, useCallback } from 'react'
import type { Issue, Comment, HistoryEntry } from '@/types'
import type { SelectOption } from '@/components/ui'
import { cn } from '@/lib/class-utils'
import { SlideOutPanel } from '@/components/layout/SlideOutPanel'
import { IssueEditorForm } from './issue-editor/IssueEditorForm'
import type { IssueFormData } from './issue-editor/validation'
import { DependenciesTab } from './DependenciesTab'
import { CommentsTab } from './CommentsTab'
import { HistoryTab } from './HistoryTab'

type TabId = 'edit' | 'dependencies' | 'comments' | 'history'

interface Tab {
  id: TabId
  label: string
}

const TABS: Tab[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
]

export interface IssueEditorPanelProps {
  isOpen: boolean
  onClose: () => void
  issue: Issue | null
  rigId: string
  availableAssignees?: SelectOption[]
  comments?: Comment[]
  commentsLoading?: boolean
  onAddComment?: (text: string) => void
  isSubmittingComment?: boolean
  historyEntries?: HistoryEntry[]
  onIssueChange?: (data: IssueFormData, isValid: boolean) => void
  onIssueClick?: (issueId: string) => void
  disabled?: boolean
}

export function IssueEditorPanel({
  isOpen,
  onClose,
  issue,
  rigId,
  availableAssignees = [],
  comments = [],
  commentsLoading = false,
  onAddComment,
  isSubmittingComment = false,
  historyEntries = [],
  onIssueChange,
  onIssueClick,
  disabled = false,
}: IssueEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('edit')

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId)
  }, [])

  if (!issue) {
    return null
  }

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title={issue.id}
    >
      <div className="flex flex-col h-full">
        {/* Tab buttons */}
        <div className="flex border-b border-border px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-accent-rust text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'edit' && (
            <div className="p-4 overflow-y-auto h-full">
              <IssueEditorForm
                issue={issue}
                availableAssignees={availableAssignees}
                onChange={onIssueChange}
                disabled={disabled}
              />
            </div>
          )}

          {activeTab === 'dependencies' && (
            <DependenciesTab
              rigId={rigId}
              issueId={issue.id}
              onIssueClick={onIssueClick}
            />
          )}

          {activeTab === 'comments' && (
            <CommentsTab
              issueId={issue.id}
              comments={comments}
              isLoading={commentsLoading}
              onAddComment={onAddComment}
              isSubmitting={isSubmittingComment}
              className="h-full"
            />
          )}

          {activeTab === 'history' && (
            <div className="p-4 h-full overflow-y-auto">
              <HistoryTab
                entries={historyEntries}
              />
            </div>
          )}
        </div>
      </div>
    </SlideOutPanel>
  )
}
