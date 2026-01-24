// Package aggregator provides a centralized service for aggregating all data
// (rigs, agents, issues, mail, activity) into a single Snapshot for WebSocket broadcasting.
package aggregator

import (
	"log/slog"
	"sync"
	"time"

	"github.com/gastown/townview/internal/beads"
	"github.com/gastown/townview/internal/mail"
	"github.com/gastown/townview/internal/rigs"
	"github.com/gastown/townview/internal/types"
)

// Snapshot represents a complete state snapshot of the system.
type Snapshot struct {
	Rigs      []types.Rig                 `json:"rigs"`
	Agents    map[string][]types.Agent    `json:"agents"`    // keyed by rigId
	Issues    map[string][]types.Issue    `json:"issues"`    // keyed by rigId
	Mail      []types.Mail                `json:"mail"`
	Activity  []types.ActivityEvent       `json:"activity"`
	Timestamp time.Time                   `json:"timestamp"`
}

// Aggregator fetches data from all sources and combines into a Snapshot.
type Aggregator struct {
	beadsClient  *beads.Client
	mailClient   *mail.Client
	rigDiscovery *rigs.Discovery
}

// NewAggregator creates a new Aggregator with the given dependencies.
func NewAggregator(beadsClient *beads.Client, mailClient *mail.Client, rigDiscovery *rigs.Discovery) *Aggregator {
	return &Aggregator{
		beadsClient:  beadsClient,
		mailClient:   mailClient,
		rigDiscovery: rigDiscovery,
	}
}

// GetSnapshot fetches all data types in parallel and returns a unified Snapshot.
// Partial failures are handled gracefully - data that succeeds is returned.
func (a *Aggregator) GetSnapshot() *Snapshot {
	snapshot := &Snapshot{
		Rigs:      []types.Rig{},
		Agents:    make(map[string][]types.Agent),
		Issues:    make(map[string][]types.Issue),
		Mail:      []types.Mail{},
		Activity:  []types.ActivityEvent{},
		Timestamp: time.Now(),
	}

	var wg sync.WaitGroup
	var mu sync.Mutex

	// Fetch rigs first (needed for per-rig data)
	rigsList, err := a.rigDiscovery.ListRigs()
	if err != nil {
		slog.Warn("Failed to list rigs", "error", err)
		return snapshot
	}
	snapshot.Rigs = rigsList

	// Fetch per-rig data in parallel
	for _, rig := range rigsList {
		rigPath := rig.Path
		rigID := rig.ID

		// Fetch agents for this rig
		wg.Add(1)
		go func(rigID, rigPath string) {
			defer wg.Done()
			agents, err := a.beadsClient.GetAgents(rigPath)
			if err != nil {
				slog.Debug("Failed to get agents", "rig", rigID, "error", err)
				return
			}
			mu.Lock()
			snapshot.Agents[rigID] = agents
			mu.Unlock()
		}(rigID, rigPath)

		// Fetch issues for this rig
		wg.Add(1)
		go func(rigID, rigPath string) {
			defer wg.Done()
			issues, err := a.beadsClient.ListIssues(rigPath, map[string]string{"all": "true"})
			if err != nil {
				slog.Debug("Failed to get issues", "rig", rigID, "error", err)
				return
			}
			mu.Lock()
			snapshot.Issues[rigID] = issues
			mu.Unlock()
		}(rigID, rigPath)
	}

	// Fetch mail in parallel (from town level)
	wg.Add(1)
	go func() {
		defer wg.Done()
		mailList, err := a.mailClient.ListMail("", mail.ListMailOptions{})
		if err != nil {
			slog.Debug("Failed to get mail", "error", err)
			return
		}
		mu.Lock()
		snapshot.Mail = mailList
		mu.Unlock()
	}()

	// Fetch activity in parallel (aggregate from all rigs)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var allActivity []types.ActivityEvent
		var activityMu sync.Mutex
		var activityWg sync.WaitGroup

		for _, rig := range rigsList {
			activityWg.Add(1)
			go func(rigPath string) {
				defer activityWg.Done()
				activity, err := a.beadsClient.GetRecentActivity(rigPath, 20)
				if err != nil {
					slog.Debug("Failed to get activity", "rig", rigPath, "error", err)
					return
				}
				activityMu.Lock()
				allActivity = append(allActivity, activity...)
				activityMu.Unlock()
			}(rig.Path)
		}
		activityWg.Wait()

		// Sort by timestamp descending and limit to most recent 50
		sortActivityByTimestamp(allActivity)
		if len(allActivity) > 50 {
			allActivity = allActivity[:50]
		}

		mu.Lock()
		snapshot.Activity = allActivity
		mu.Unlock()
	}()

	wg.Wait()
	return snapshot
}

// sortActivityByTimestamp sorts activity events by timestamp descending (most recent first).
func sortActivityByTimestamp(events []types.ActivityEvent) {
	for i := 0; i < len(events)-1; i++ {
		for j := i + 1; j < len(events); j++ {
			if events[j].Timestamp.After(events[i].Timestamp) {
				events[i], events[j] = events[j], events[i]
			}
		}
	}
}
