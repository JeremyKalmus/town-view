package aggregator

import (
	"testing"
	"time"

	"github.com/gastown/townview/internal/types"
)

func TestSortActivityByTimestamp(t *testing.T) {
	now := time.Now()
	events := []types.ActivityEvent{
		{ID: "1", Timestamp: now.Add(-2 * time.Hour)},
		{ID: "2", Timestamp: now.Add(-1 * time.Hour)},
		{ID: "3", Timestamp: now},
	}

	sortActivityByTimestamp(events)

	// Should be sorted most recent first
	if events[0].ID != "3" {
		t.Errorf("Expected first event ID to be '3', got %q", events[0].ID)
	}
	if events[1].ID != "2" {
		t.Errorf("Expected second event ID to be '2', got %q", events[1].ID)
	}
	if events[2].ID != "1" {
		t.Errorf("Expected third event ID to be '1', got %q", events[2].ID)
	}
}

func TestSnapshotStructure(t *testing.T) {
	// Verify Snapshot has the expected structure
	snapshot := &Snapshot{
		Rigs:      []types.Rig{},
		Agents:    make(map[string][]types.Agent),
		Issues:    make(map[string][]types.Issue),
		Mail:      []types.Mail{},
		Activity:  []types.ActivityEvent{},
		Timestamp: time.Now(),
	}

	if snapshot.Rigs == nil {
		t.Error("Rigs should not be nil")
	}
	if snapshot.Agents == nil {
		t.Error("Agents should not be nil")
	}
	if snapshot.Issues == nil {
		t.Error("Issues should not be nil")
	}
	if snapshot.Mail == nil {
		t.Error("Mail should not be nil")
	}
	if snapshot.Activity == nil {
		t.Error("Activity should not be nil")
	}
	if snapshot.Timestamp.IsZero() {
		t.Error("Timestamp should not be zero")
	}
}

func TestNewAggregator(t *testing.T) {
	// Verify constructor doesn't panic with nil dependencies
	// (will fail at runtime if used, but that's expected)
	agg := NewAggregator(nil, nil, nil)
	if agg == nil {
		t.Error("NewAggregator should return non-nil aggregator")
	}
}
