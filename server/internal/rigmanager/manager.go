// Package rigmanager provides multi-rig management for the Service Layer.
// It discovers rigs from the filesystem and maintains QueryService instances per rig.
package rigmanager

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gastown/townview/internal/events"
	"github.com/gastown/townview/internal/query"
	"github.com/gastown/townview/internal/registry"
	"github.com/gastown/townview/internal/types"
)

// Rig represents a discovered rig with its services.
type Rig struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Prefix       string         `json:"prefix"`
	Path         string         `json:"path"`         // Relative path from town root
	AbsPath      string         `json:"abs_path"`     // Absolute path
	BeadsPath    string         `json:"beads_path"`   // Path to .beads directory
	DBPath       string         `json:"db_path"`      // Path to beads.db
	QueryService *query.Service `json:"-"`            // Query service for this rig
}

// Manager manages multiple rigs and their services.
type Manager struct {
	townRoot      string
	rigs          map[string]*Rig
	eventStore    *events.Store
	agentRegistry *registry.Registry
	mu            sync.RWMutex
}

// Config holds configuration for the RigManager.
type Config struct {
	TownRoot string
}

// New creates a new RigManager.
func New(config Config, eventStore *events.Store, agentRegistry *registry.Registry) (*Manager, error) {
	if config.TownRoot == "" {
		return nil, fmt.Errorf("town root is required")
	}

	// Verify town root exists
	if _, err := os.Stat(config.TownRoot); os.IsNotExist(err) {
		return nil, fmt.Errorf("town root does not exist: %s", config.TownRoot)
	}

	m := &Manager{
		townRoot:      config.TownRoot,
		rigs:          make(map[string]*Rig),
		eventStore:    eventStore,
		agentRegistry: agentRegistry,
	}

	// Discover rigs
	if err := m.discoverRigs(); err != nil {
		return nil, fmt.Errorf("failed to discover rigs: %w", err)
	}

	return m, nil
}

// discoverRigs finds all rigs in the town.
func (m *Manager) discoverRigs() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check for HQ (town-level beads)
	hqBeadsPath := filepath.Join(m.townRoot, ".beads")
	if _, err := os.Stat(hqBeadsPath); err == nil {
		m.addRig("hq", "HQ (Town)", "hq-", ".", hqBeadsPath)
	}

	// Scan for rig directories
	entries, err := os.ReadDir(m.townRoot)
	if err != nil {
		return fmt.Errorf("failed to read town root: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := entry.Name()
		// Skip hidden directories and known non-rig directories
		if strings.HasPrefix(name, ".") || name == "node_modules" {
			continue
		}

		dirPath := filepath.Join(m.townRoot, name)

		// Check for .beads directory directly in the rig
		beadsPath := filepath.Join(dirPath, ".beads")
		if _, err := os.Stat(beadsPath); err == nil {
			prefix := m.inferPrefix(name, beadsPath)
			m.addRig(name, name, prefix, name, beadsPath)
			continue
		}

		// Check for mayor/rig structure (some rigs have this)
		mayorRigPath := filepath.Join(dirPath, "mayor", "rig", ".beads")
		if _, err := os.Stat(mayorRigPath); err == nil {
			prefix := m.inferPrefix(name, mayorRigPath)
			m.addRig(name, name, prefix, filepath.Join(name, "mayor", "rig"), mayorRigPath)
		}
	}

	slog.Info("Discovered rigs", "count", len(m.rigs))
	for id, rig := range m.rigs {
		slog.Debug("Rig discovered", "id", id, "prefix", rig.Prefix, "db", rig.DBPath)
	}

	return nil
}

// addRig adds a rig to the manager and initializes its QueryService.
func (m *Manager) addRig(id, name, prefix, relPath, beadsPath string) {
	dbPath := filepath.Join(beadsPath, "beads.db")

	// Verify database exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		slog.Warn("Rig database not found, skipping", "id", id, "db", dbPath)
		return
	}

	rig := &Rig{
		ID:        id,
		Name:      name,
		Prefix:    prefix,
		Path:      relPath,
		AbsPath:   filepath.Join(m.townRoot, relPath),
		BeadsPath: beadsPath,
		DBPath:    dbPath,
	}

	// Initialize QueryService for this rig
	queryConfig := query.Config{
		DBPath:      dbPath,
		CacheConfig: query.DefaultCacheConfig(),
	}

	qs, err := query.New(queryConfig, m.agentRegistry, m.eventStore)
	if err != nil {
		slog.Error("Failed to create QueryService for rig", "id", id, "error", err)
		return
	}

	rig.QueryService = qs
	m.rigs[id] = rig
}

// inferPrefix tries to determine the rig's issue prefix.
func (m *Manager) inferPrefix(name, beadsPath string) string {
	// Try to read from config file
	configPath := filepath.Join(beadsPath, "config.yaml")
	if data, err := os.ReadFile(configPath); err == nil {
		// Simple parsing - look for prefix line
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "prefix:") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) == 2 {
					return strings.TrimSpace(parts[1])
				}
			}
		}
	}

	// Default: first two letters + hyphen
	if len(name) >= 2 {
		return strings.ToLower(name[:2]) + "-"
	}
	return strings.ToLower(name) + "-"
}

// Close shuts down all QueryServices.
func (m *Manager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var lastErr error
	for id, rig := range m.rigs {
		if rig.QueryService != nil {
			if err := rig.QueryService.Close(); err != nil {
				slog.Error("Failed to close QueryService", "rig", id, "error", err)
				lastErr = err
			}
		}
	}
	return lastErr
}

// ListRigs returns all discovered rigs.
func (m *Manager) ListRigs() []types.Rig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]types.Rig, 0, len(m.rigs))
	for _, rig := range m.rigs {
		r := types.Rig{
			ID:        rig.ID,
			Name:      rig.Name,
			Prefix:    rig.Prefix,
			Path:      rig.Path,
			BeadsPath: rig.BeadsPath,
		}

		// Get counts from QueryService
		if rig.QueryService != nil {
			issues, _ := rig.QueryService.ListIssues(query.IssueFilter{})
			r.IssueCount = len(issues)

			openCount := 0
			for _, issue := range issues {
				if issue.Status == "open" || issue.Status == "in_progress" {
					openCount++
				}
			}
			r.OpenCount = openCount
		}

		// Get agent info from registry
		if m.agentRegistry != nil {
			rigID := rig.ID
			agents := m.agentRegistry.ListAgents(&registry.AgentFilter{Rig: &rigID})
			r.AgentCount = len(agents)
			health := m.computeAgentHealth(agents)
			r.AgentHealth = &health
		}

		result = append(result, r)
	}

	return result
}

// computeAgentHealth computes health status for each role.
func (m *Manager) computeAgentHealth(agents []registry.AgentState) types.AgentHealth {
	health := types.AgentHealth{}

	for _, agent := range agents {
		status := string(agent.Status)
		switch agent.Role {
		case registry.RoleWitness:
			health.Witness = &status
		case registry.RoleRefinery:
			health.Refinery = &status
		case registry.RoleCrew:
			health.Crew = &status
		}
	}

	return health
}

// GetRig returns a specific rig by ID.
func (m *Manager) GetRig(rigID string) (*Rig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	rig, ok := m.rigs[rigID]
	if !ok {
		return nil, fmt.Errorf("rig not found: %s", rigID)
	}
	return rig, nil
}

// ListIssues returns issues from a specific rig.
func (m *Manager) ListIssues(rigID string, filter query.IssueFilter) ([]types.Issue, error) {
	rig, err := m.GetRig(rigID)
	if err != nil {
		return nil, err
	}
	if rig.QueryService == nil {
		return nil, fmt.Errorf("rig %s has no query service", rigID)
	}
	return rig.QueryService.ListIssues(filter)
}

// GetIssue returns a specific issue from a rig.
func (m *Manager) GetIssue(rigID, issueID string) (*types.Issue, error) {
	rig, err := m.GetRig(rigID)
	if err != nil {
		return nil, err
	}
	if rig.QueryService == nil {
		return nil, fmt.Errorf("rig %s has no query service", rigID)
	}
	return rig.QueryService.GetIssue(issueID)
}

// ListAllIssues returns issues from all rigs.
func (m *Manager) ListAllIssues(filter query.IssueFilter) []types.Issue {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var result []types.Issue
	for _, rig := range m.rigs {
		if rig.QueryService != nil {
			issues, err := rig.QueryService.ListIssues(filter)
			if err != nil {
				slog.Debug("Failed to list issues for rig", "rig", rig.ID, "error", err)
				continue
			}
			result = append(result, issues...)
		}
	}
	return result
}

// GetDependencies returns dependencies for an issue.
func (m *Manager) GetDependencies(rigID, issueID string) (*types.IssueDependencies, error) {
	rig, err := m.GetRig(rigID)
	if err != nil {
		return nil, err
	}
	if rig.QueryService == nil {
		return nil, fmt.Errorf("rig %s has no query service", rigID)
	}
	return rig.QueryService.GetDependencies(issueID)
}

// GetConvoyProgress returns progress for a convoy/molecule.
func (m *Manager) GetConvoyProgress(rigID, issueID string) (*types.ConvoyProgress, error) {
	rig, err := m.GetRig(rigID)
	if err != nil {
		return nil, err
	}
	if rig.QueryService == nil {
		return nil, fmt.Errorf("rig %s has no query service", rigID)
	}
	return rig.QueryService.GetConvoyProgress(issueID)
}

// RefreshRig forces a refresh of rig data (clears cache).
func (m *Manager) RefreshRig(rigID string) error {
	rig, err := m.GetRig(rigID)
	if err != nil {
		return err
	}
	if rig.QueryService != nil {
		rig.QueryService.InvalidateCache()
	}
	return nil
}

// RefreshAll forces a refresh of all rigs.
func (m *Manager) RefreshAll() {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, rig := range m.rigs {
		if rig.QueryService != nil {
			rig.QueryService.InvalidateCache()
		}
	}
}
