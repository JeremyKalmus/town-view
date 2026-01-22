// Package convoy provides convoy progress tracking and notifications.
package convoy

import (
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/gastown/townview/internal/beads"
	"github.com/gastown/townview/internal/types"
	"github.com/gastown/townview/internal/ws"
)

// Notifier handles debounced convoy progress change notifications.
type Notifier struct {
	beadsClient *beads.Client
	wsHub       *ws.Hub

	mu             sync.Mutex
	pendingConvoys map[string]*pendingUpdate // key: rigID:convoyID
	timers         map[string]*time.Timer
}

type pendingUpdate struct {
	rigID    string
	rigPath  string
	convoyID string
}

// NewNotifier creates a new convoy progress notifier.
func NewNotifier(beadsClient *beads.Client, wsHub *ws.Hub) *Notifier {
	return &Notifier{
		beadsClient:    beadsClient,
		wsHub:          wsHub,
		pendingConvoys: make(map[string]*pendingUpdate),
		timers:         make(map[string]*time.Timer),
	}
}

// NotifyIssueChanged checks if the changed issue belongs to a convoy and
// schedules a debounced progress update notification.
func (n *Notifier) NotifyIssueChanged(rigID, rigPath, issueID string) {
	// Find convoy ID from issue ID using hierarchical naming
	convoyID := findConvoyID(issueID)
	if convoyID == "" {
		return // Issue doesn't belong to a convoy
	}

	key := rigID + ":" + convoyID

	n.mu.Lock()
	defer n.mu.Unlock()

	// Cancel existing timer if any
	if timer, exists := n.timers[key]; exists {
		timer.Stop()
	}

	// Store pending update
	n.pendingConvoys[key] = &pendingUpdate{
		rigID:    rigID,
		rigPath:  rigPath,
		convoyID: convoyID,
	}

	// Start debounce timer (100ms)
	n.timers[key] = time.AfterFunc(100*time.Millisecond, func() {
		n.flushUpdate(key)
	})
}

// flushUpdate sends the debounced convoy progress update.
func (n *Notifier) flushUpdate(key string) {
	n.mu.Lock()
	pending, exists := n.pendingConvoys[key]
	if !exists {
		n.mu.Unlock()
		return
	}
	delete(n.pendingConvoys, key)
	delete(n.timers, key)
	n.mu.Unlock()

	// Calculate progress
	progress, err := n.calculateProgress(pending.rigPath, pending.convoyID)
	if err != nil {
		slog.Error("Failed to calculate convoy progress",
			"rigId", pending.rigID,
			"convoyId", pending.convoyID,
			"error", err)
		return
	}

	// Broadcast event
	n.wsHub.Broadcast(types.WSMessage{
		Type: "convoy_progress_changed",
		Rig:  pending.rigID,
		Payload: map[string]interface{}{
			"convoy_id": pending.convoyID,
			"progress":  progress,
		},
	})

	slog.Debug("Broadcast convoy_progress_changed",
		"rigId", pending.rigID,
		"convoyId", pending.convoyID,
		"total", progress.Total,
		"closed", progress.Closed)
}

// calculateProgress computes the progress of a convoy by counting descendant issue statuses.
func (n *Notifier) calculateProgress(rigPath, convoyID string) (*types.ConvoyProgress, error) {
	// Get all issues for the rig
	issues, err := n.beadsClient.ListIssues(rigPath, map[string]string{"all": "true"})
	if err != nil {
		return nil, err
	}

	progress := &types.ConvoyProgress{
		ConvoyID: convoyID,
	}

	prefix := convoyID + "."

	for _, issue := range issues {
		// Skip the convoy itself, only count descendants
		if !strings.HasPrefix(issue.ID, prefix) {
			continue
		}

		progress.Total++

		switch issue.Status {
		case types.StatusOpen:
			progress.Open++
		case types.StatusInProgress:
			progress.InProgress++
		case types.StatusBlocked:
			progress.Blocked++
		case types.StatusClosed, types.StatusTombstone:
			progress.Closed++
		}
	}

	return progress, nil
}

// findConvoyID extracts the root convoy ID from an issue ID using hierarchical naming.
// For example: "convoy-001.1.2" -> finds the root if it's a convoy type.
// Returns empty string if the issue doesn't belong to a convoy.
func findConvoyID(issueID string) string {
	// Walk up the hierarchy to find a convoy root
	// The naming convention uses dots to separate hierarchy levels
	parts := strings.Split(issueID, ".")
	if len(parts) < 2 {
		return "" // No parent, can't be under a convoy
	}

	// Return the root ID (first part before any dots)
	// This is the potential convoy ID
	return parts[0]
}
