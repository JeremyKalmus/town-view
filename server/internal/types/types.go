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
