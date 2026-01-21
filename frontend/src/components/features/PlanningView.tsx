/**
 * PlanningView - Primary view for planning and organizing work hierarchy
 * Part of the three-view architecture: Planning | Monitoring | Audit
 *
 * Features:
 * - Hierarchical tree of epics → tasks → subtasks
 * - FilterBar for status/type/assignee/priority filtering
 * - SlideOutPanel with tabs: Edit | Dependencies | Comments | History
 * - Real-time updates via refreshKey prop
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Issue, Comment, HistoryEntry, Dependency } from '@/types'
import { useRigStore } from '@/stores/rig-store'
import { useToastStore } from '@/stores/toast-store'
import { TreeView, type TreeNodeData } from './TreeNode'
import { FilterBar, getVisibleNodeIds } from './FilterBar'
import { SlideOutPanel } from '@/components/layout/SlideOutPanel'
import { IssueEditorForm } from './issue-editor'
import { DependenciesTab } from './DependenciesTab'
import { CommentsTab } from './CommentsTab'
import { HistoryTab } from './HistoryTab'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { cachedFetch } from '@/services/cache'
import { updateIssue } from '@/services/api'
import { buildTree, getParentId } from '@/lib/tree'
import { cn } from '@/lib/utils'
import type { IssueFormData } from './issue-editor/validation'

type PanelTab = 'edit' | 'dependencies' | 'comments' | 'history'

interface PlanningViewProps {
  refreshKey?: number
}

export function PlanningView({ refreshKey = 0 }: PlanningViewProps) {
  const { selectedRig, treeFilters, setTreeFilters } = useRigStore()
  const { showToast } = useToastStore()

  // Issues state
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Panel state
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<PanelTab>('edit')

  // Edit form state
  const [formData, setFormData] = useState<IssueFormData | null>(null)
  const [isFormValid, setIsFormValid] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Dependencies state for blocker indicators
  const [dependencies, setDependencies] = useState<Dependency[]>([])

  // Fetch issues
  useEffect(() => {
    if (!selectedRig) return

    const fetchIssues = async () => {
      setLoading(true)
      setError(null)

      const url = `/api/rigs/${selectedRig.id}/issues?all=true`
      const result = await cachedFetch<Issue[]>(url, {
        cacheTTL: 2 * 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        setIssues(result.data)
        setLoading(false)
      } else if (result.error) {
        setError(result.error)
        setLoading(false)
      }
    }

    fetchIssues()
  }, [selectedRig, refreshKey])

  // Fetch dependencies for blocker indicators
  useEffect(() => {
    if (!selectedRig) return

    const fetchDependencies = async () => {
      const url = `/api/rigs/${selectedRig.id}/dependencies`
      const result = await cachedFetch<Dependency[]>(url, {
        cacheTTL: 2 * 60 * 1000,
        returnStaleOnError: true,
      })

      if (result.data) {
        setDependencies(result.data)
      }
    }

    fetchDependencies()
  }, [selectedRig, refreshKey])

  // Fetch comments when dependencies tab is active
  useEffect(() => {
    if (!selectedRig || !selectedIssue || activeTab !== 'comments') return

    const fetchComments = async () => {
      setCommentsLoading(true)
      const url = `/api/rigs/${selectedRig.id}/issues/${selectedIssue.id}/comments`
      const result = await cachedFetch<Comment[]>(url, {
        cacheTTL: 60 * 1000,
        returnStaleOnError: true,
      })
      if (result.data) {
        setComments(result.data)
      }
      setCommentsLoading(false)
    }

    fetchComments()
  }, [selectedRig, selectedIssue, activeTab])

  // Fetch history when history tab is active
  useEffect(() => {
    if (!selectedRig || !selectedIssue || activeTab !== 'history') return

    const fetchHistory = async () => {
      setHistoryLoading(true)
      const url = `/api/rigs/${selectedRig.id}/issues/${selectedIssue.id}/history`
      const result = await cachedFetch<HistoryEntry[]>(url, {
        cacheTTL: 60 * 1000,
        returnStaleOnError: true,
      })
      if (result.data) {
        setHistory(result.data)
      }
      setHistoryLoading(false)
    }

    fetchHistory()
  }, [selectedRig, selectedIssue, activeTab])

  // Build parent lookup for filtering
  const parentLookup = new Map<string, string | undefined>()
  for (const issue of issues) {
    parentLookup.set(issue.id, getParentId(issue.id) ?? undefined)
  }

  // Build blocker lookup from dependencies (from_id blocks to_id, so to_id is blocked by from_id)
  const blockerLookup = useMemo(() => {
    const lookup = new Map<string, Array<{ id: string; title?: string }>>()
    const issueMap = new Map(issues.map((i) => [i.id, i]))

    for (const dep of dependencies) {
      if (dep.type === 'blocks') {
        // dep.from_id blocks dep.to_id, so to_id has from_id as a blocker
        const blockers = lookup.get(dep.to_id) || []
        const blockerIssue = issueMap.get(dep.from_id)
        blockers.push({
          id: dep.from_id,
          title: blockerIssue?.title,
        })
        lookup.set(dep.to_id, blockers)
      }
    }

    return lookup
  }, [dependencies, issues])

  // Get visible node IDs based on filters
  const visibleIds = getVisibleNodeIds(issues, treeFilters, parentLookup)

  // Filter issues and build tree
  const filteredIssues = issues.filter((issue) => visibleIds.has(issue.id))
  const treeData = buildTree(filteredIssues)

  // Convert tree to TreeNodeData format with blocker info
  const convertToTreeNodeData = (nodes: ReturnType<typeof buildTree>): TreeNodeData[] => {
    return nodes.map((node) => ({
      issue: node.issue,
      children: node.children.length > 0 ? convertToTreeNodeData(node.children) : undefined,
      blockers: blockerLookup.get(node.issue.id),
    }))
  }

  const treeNodeData = convertToTreeNodeData(treeData)

  // Get unique assignees for filter dropdown
  const assignees = [...new Set(issues.map((i) => i.assignee).filter(Boolean))] as string[]

  // Handle node click - open panel
  const handleNodeClick = useCallback((issue: Issue) => {
    setSelectedIssue(issue)
    setActiveTab('edit')
    setPanelOpen(true)
    setFormData(null) // Reset form data
  }, [])

  // Handle panel close
  const handlePanelClose = useCallback(() => {
    setPanelOpen(false)
    setSelectedIssue(null)
    setFormData(null)
  }, [])

  // Handle form changes
  const handleFormChange = useCallback((data: IssueFormData, isValid: boolean) => {
    setFormData(data)
    setIsFormValid(isValid)
  }, [])

  // Handle save click - show confirmation modal
  const handleSaveClick = useCallback(() => {
    if (!isFormValid || !formData || !selectedIssue) return
    setShowConfirmModal(true)
  }, [isFormValid, formData, selectedIssue])

  // Handle save confirmation
  const handleSaveConfirm = useCallback(async () => {
    if (!selectedRig || !selectedIssue || !formData) return

    setIsSaving(true)
    setShowConfirmModal(false)

    const result = await updateIssue(selectedRig.id, selectedIssue.id, {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      labels: formData.labels,
      assignee: formData.assignee || undefined,
    })

    setIsSaving(false)

    if (result.success) {
      showToast('Issue Updated', `${selectedIssue.id} has been updated successfully.`, 'success')
      // Update local state
      setIssues((prev) =>
        prev.map((i) => (i.id === selectedIssue.id && result.issue ? result.issue : i))
      )
      if (result.issue) {
        setSelectedIssue(result.issue)
      }
    } else {
      showToast('Update Failed', result.error?.message || 'Failed to update issue.', 'error')
    }
  }, [selectedRig, selectedIssue, formData, showToast])

  // Handle add comment
  const handleAddComment = useCallback(
    async (text: string) => {
      if (!selectedRig || !selectedIssue) return

      setIsAddingComment(true)
      try {
        const res = await fetch(
          `/api/rigs/${selectedRig.id}/issues/${selectedIssue.id}/comments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          }
        )

        if (res.ok) {
          const newComment = await res.json()
          setComments((prev) => [...prev, newComment])
          showToast('Comment Added', 'Your comment has been added.', 'success')
        } else {
          throw new Error('Failed to add comment')
        }
      } catch {
        showToast('Failed to Add Comment', 'Please try again.', 'error')
      } finally {
        setIsAddingComment(false)
      }
    },
    [selectedRig, selectedIssue, showToast]
  )

  // Handle clicking a dependency/blocker to navigate
  const handleDependencyClick = useCallback(
    (issueId: string) => {
      const issue = issues.find((i) => i.id === issueId)
      if (issue) {
        setSelectedIssue(issue)
        setActiveTab('edit')
        setPanelOpen(true)
      }
    },
    [issues]
  )

  // Handle clicking a blocker indicator in the tree (alias for dependency click)
  const handleBlockerClick = handleDependencyClick

  // Check if there are changes to save
  const hasChanges = selectedIssue && formData && (
    formData.title !== selectedIssue.title ||
    formData.description !== selectedIssue.description ||
    formData.status !== selectedIssue.status ||
    formData.priority !== selectedIssue.priority ||
    formData.assignee !== (selectedIssue.assignee ?? '') ||
    JSON.stringify(formData.labels.sort()) !== JSON.stringify((selectedIssue.labels ?? []).sort())
  )

  if (!selectedRig) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted">Select a rig from the sidebar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* FilterBar */}
      <div className="px-6 py-4 border-b border-border bg-bg-secondary">
        <FilterBar
          filters={treeFilters}
          onFiltersChange={setTreeFilters}
          assignees={assignees}
        />
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-bg-tertiary rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-status-blocked">{error}</div>
        ) : treeNodeData.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            {issues.length === 0
              ? 'No issues found in this rig'
              : 'No issues match the current filters'}
          </div>
        ) : (
          <TreeView
            nodes={treeNodeData}
            defaultExpanded={true}
            onNodeClick={handleNodeClick}
            onBlockerClick={handleBlockerClick}
          />
        )}
      </div>

      {/* Issue Editor Panel */}
      <SlideOutPanel
        isOpen={panelOpen}
        onClose={handlePanelClose}
        title={selectedIssue?.id}
        className="w-[500px]"
      >
        {selectedIssue && (
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-border">
              {(['edit', 'dependencies', 'comments', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'text-text-primary border-b-2 border-accent-rust'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'edit' && (
                <div className="p-4">
                  <IssueEditorForm
                    issue={selectedIssue}
                    onChange={handleFormChange}
                    disabled={isSaving}
                  />
                  {/* Save button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSaveClick}
                      disabled={!isFormValid || isSaving || !hasChanges || showConfirmModal}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium',
                        'bg-accent-rust text-white',
                        'hover:bg-accent-rust/90 transition-colors',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'dependencies' && (
                <DependenciesTab
                  rigId={selectedRig.id}
                  issueId={selectedIssue.id}
                  onIssueClick={handleDependencyClick}
                />
              )}

              {activeTab === 'comments' && (
                <CommentsTab
                  issueId={selectedIssue.id}
                  comments={comments}
                  isLoading={commentsLoading}
                  onAddComment={handleAddComment}
                  isSubmitting={isAddingComment}
                  className="h-full"
                />
              )}

              {activeTab === 'history' && (
                <div className="p-4">
                  {historyLoading ? (
                    <div className="text-text-muted text-sm">Loading history...</div>
                  ) : (
                    <HistoryTab entries={history} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SlideOutPanel>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedIssue && formData && (
        <ConfirmationModal
          issue={selectedIssue}
          changes={{
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            labels: formData.labels,
            assignee: formData.assignee || undefined,
          }}
          isOpen={showConfirmModal}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowConfirmModal(false)}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
