// Package types defines shared data types for Town View.
package types

import "time"

// Issue represents a bead issue.
type Issue struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	Status          string     `json:"status"`
	Priority        int        `json:"priority"`
	IssueType       string     `json:"issue_type"`
	Owner           string     `json:"owner,omitempty"`
	Assignee        string     `json:"assignee,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	CreatedBy       string     `json:"created_by,omitempty"`
	UpdatedAt       time.Time  `json:"updated_at"`
	ClosedAt        *time.Time `json:"closed_at,omitempty"`
	CloseReason     string     `json:"close_reason,omitempty"`
	Labels          []string   `json:"labels,omitempty"`
	DependencyCount int        `json:"dependency_count"`
	DependentCount  int        `json:"dependent_count"`
	Parent          string     `json:"parent,omitempty"`
}

// Dependency represents a dependency relationship between issues.
type Dependency struct {
	FromID   string `json:"from_id"`
	ToID     string `json:"to_id"`
	Type     string `json:"type"` // "blocks", "parent-child"
}

// IssueDependencies contains blockers and blocked-by for an issue.
type IssueDependencies struct {
	Blockers  []Issue `json:"blockers"`   // Issues that block this issue
	BlockedBy []Issue `json:"blocked_by"` // Issues blocked by this issue
}

// DependencyAdd represents a request to add a dependency.
type DependencyAdd struct {
	BlockerID string `json:"blocker_id"` // The issue that blocks
}

// Rig represents a Gas Town rig.
type Rig struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Prefix     string `json:"prefix"`
	Path       string `json:"path"`
	BeadsPath  string `json:"beads_path"`
	IssueCount int    `json:"issue_count"`
	OpenCount  int    `json:"open_count"`
	AgentCount int    `json:"agent_count"`
}

// Agent represents a Gas Town agent.
type Agent struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	RoleType  string    `json:"role_type"`
	Rig       string    `json:"rig"`
	State     string    `json:"state"`
	HookBead  string    `json:"hook_bead,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

// IssueUpdate represents a partial update to an issue.
type IssueUpdate struct {
	Status      *string   `json:"status,omitempty"`
	Priority    *int      `json:"priority,omitempty"`
	Title       *string   `json:"title,omitempty"`
	Description *string   `json:"description,omitempty"`
	Assignee    *string   `json:"assignee,omitempty"`
	Labels      *[]string `json:"labels,omitempty"`
}

// WSMessage represents a WebSocket message.
type WSMessage struct {
	Type    string      `json:"type"`
	Rig     string      `json:"rig,omitempty"`
	Payload interface{} `json:"payload,omitempty"`
}

// MoleculeProgress represents progress of a molecule's execution.
type MoleculeProgress struct {
	IssueID     string `json:"issue_id"`
	CurrentStep int    `json:"current_step"`
	TotalSteps  int    `json:"total_steps"`
	StepName    string `json:"step_name"`
	Status      string `json:"status"`
}

// ConvoyProgress represents the progress of a convoy's tracked issues.
type ConvoyProgress struct {
	ConvoyID   string `json:"convoy_id"`
	Total      int    `json:"total"`       // Total tracked issues
	Open       int    `json:"open"`        // Issues with status 'open'
	InProgress int    `json:"in_progress"` // Issues with status 'in_progress'
	Blocked    int    `json:"blocked"`     // Issues with status 'blocked'
	Closed     int    `json:"closed"`      // Issues with status 'closed'
}

// PeekOutput represents output from peeking at an agent's session.
type PeekOutput struct {
	AgentID   string    `json:"agent_id"`
	Lines     []string  `json:"lines"`
	Timestamp time.Time `json:"timestamp"`
}

// ActivityEvent represents an activity event for the monitoring view.
type ActivityEvent struct {
	ID        string    `json:"id"`
	IssueID   string    `json:"issue_id"`
	IssueType string    `json:"issue_type"`
	Title     string    `json:"title"`
	EventType string    `json:"event_type"`
	OldValue  string    `json:"old_value,omitempty"`
	NewValue  string    `json:"new_value,omitempty"`
	Actor     string    `json:"actor"`
	Timestamp time.Time `json:"timestamp"`
}

// Issue statuses
const (
	StatusOpen       = "open"
	StatusInProgress = "in_progress"
	StatusBlocked    = "blocked"
	StatusDeferred   = "deferred"
	StatusClosed     = "closed"
	StatusTombstone  = "tombstone"
)

// Issue types
const (
	TypeBug          = "bug"
	TypeFeature      = "feature"
	TypeTask         = "task"
	TypeEpic         = "epic"
	TypeChore        = "chore"
	TypeMergeRequest = "merge-request"
	TypeMolecule     = "molecule"
	TypeGate         = "gate"
	TypeConvoy       = "convoy"
	TypeAgent        = "agent"
)

// Agent role types
const (
	RoleWitness  = "witness"
	RoleRefinery = "refinery"
	RoleCrew     = "crew"
	RolePolecat  = "polecat"
	RoleDeacon   = "deacon"
	RoleMayor    = "mayor"
)

// Mail represents a mail message in the Gas Town mail system.
type Mail struct {
	ID        string    `json:"id"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Subject   string    `json:"subject"`
	Body      string    `json:"body"`
	Timestamp time.Time `json:"timestamp"`
	Read      bool      `json:"read"`
}
