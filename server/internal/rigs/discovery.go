// Package rigs provides rig discovery functionality.
package rigs

import (
	"bufio"
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gastown/townview/internal/beads"
	"github.com/gastown/townview/internal/types"
)

// RouteEntry represents a line from routes.jsonl.
type RouteEntry struct {
	Prefix string `json:"prefix"`
	Path   string `json:"path"`
}

// Discovery handles rig discovery from routes.jsonl and directory scanning.
type Discovery struct {
	townRoot    string
	beadsClient *beads.Client
	cache       map[string]*types.Rig
	mu          sync.RWMutex
}

// NewDiscovery creates a new rig discovery service.
func NewDiscovery(townRoot string, beadsClient *beads.Client) *Discovery {
	return &Discovery{
		townRoot:    townRoot,
		beadsClient: beadsClient,
		cache:       make(map[string]*types.Rig),
	}
}

// ListRigs returns all discovered rigs.
func (d *Discovery) ListRigs() ([]types.Rig, error) {
	rigs, err := d.discoverRigs()
	if err != nil {
		return nil, err
	}

	// Enrich with counts
	result := make([]types.Rig, 0, len(rigs))
	for _, rig := range rigs {
		enriched := d.enrichRig(rig)
		result = append(result, enriched)
	}

	return result, nil
}

// GetRig returns a specific rig by ID.
func (d *Discovery) GetRig(rigID string) (*types.Rig, error) {
	rigs, err := d.discoverRigs()
	if err != nil {
		return nil, err
	}

	for _, rig := range rigs {
		if rig.ID == rigID || rig.Name == rigID || rig.Prefix == rigID {
			enriched := d.enrichRig(rig)
			return &enriched, nil
		}
	}

	return nil, nil
}

// discoverRigs finds all rigs from routes.jsonl and directory scanning.
func (d *Discovery) discoverRigs() ([]types.Rig, error) {
	seen := make(map[string]bool) // Keyed by rig ID (name)
	var rigs []types.Rig

	// 1. Read routes.jsonl
	routesPath := filepath.Join(d.townRoot, ".beads", "routes.jsonl")
	if entries, err := d.readRoutes(routesPath); err == nil {
		for _, entry := range entries {
			// Skip convoy routes and duplicates
			if strings.Contains(entry.Prefix, "-cv-") {
				continue
			}

			rig := d.routeToRig(entry)
			if rig == nil {
				continue
			}

			// Dedupe by rig ID (name), not path
			if seen[rig.ID] {
				continue
			}
			seen[rig.ID] = true
			rigs = append(rigs, *rig)
		}
	} else {
		slog.Warn("Failed to read routes.jsonl", "error", err)
	}

	// 2. Scan for directories with .beads/config.yaml
	entries, err := os.ReadDir(d.townRoot)
	if err != nil {
		return rigs, nil // Return what we have
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		// Skip hidden and known non-rig directories
		name := entry.Name()
		if strings.HasPrefix(name, ".") || name == "node_modules" {
			continue
		}
		if seen[name] {
			continue
		}

		// Check for .beads directory
		beadsPath := filepath.Join(d.townRoot, name, ".beads")
		if _, err := os.Stat(beadsPath); os.IsNotExist(err) {
			continue
		}

		// Read config.yaml for prefix
		configPath := filepath.Join(beadsPath, "config.yaml")
		prefix := d.readPrefixFromConfig(configPath)
		if prefix == "" {
			prefix = strings.ToLower(name[:2]) + "-" // Fallback
		}

		seen[name] = true
		rigs = append(rigs, types.Rig{
			ID:        name,
			Name:      name,
			Prefix:    prefix,
			Path:      name,
			BeadsPath: beadsPath,
		})
	}

	// 3. Add HQ (town-level beads) if it has issues
	hqBeadsPath := filepath.Join(d.townRoot, ".beads")
	if _, err := os.Stat(hqBeadsPath); err == nil && !seen["."] {
		rigs = append([]types.Rig{{
			ID:        "hq",
			Name:      "HQ (Town)",
			Prefix:    "hq-",
			Path:      ".",
			BeadsPath: hqBeadsPath,
		}}, rigs...)
	}

	return rigs, nil
}

// readRoutes parses routes.jsonl file.
func (d *Discovery) readRoutes(path string) ([]RouteEntry, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var entries []RouteEntry
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var entry RouteEntry
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			slog.Warn("Failed to parse route entry", "line", line, "error", err)
			continue
		}
		entries = append(entries, entry)
	}

	return entries, scanner.Err()
}

// routeToRig converts a route entry to a Rig.
func (d *Discovery) routeToRig(entry RouteEntry) *types.Rig {
	path := entry.Path
	if path == "." {
		return nil // HQ handled separately
	}

	// Resolve the actual path
	fullPath := filepath.Join(d.townRoot, path)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return nil
	}

	// Get the rig name from path
	name := filepath.Base(path)
	if strings.Contains(path, "/") {
		// For nested paths like "heyhey/mayor/rig", use first component
		parts := strings.Split(path, "/")
		name = parts[0]
	}

	beadsPath := filepath.Join(fullPath, ".beads")
	if _, err := os.Stat(beadsPath); os.IsNotExist(err) {
		// Check parent for beads
		beadsPath = filepath.Join(d.townRoot, name, ".beads")
	}

	return &types.Rig{
		ID:        name,
		Name:      name,
		Prefix:    entry.Prefix,
		Path:      path,
		BeadsPath: beadsPath,
	}
}

// readPrefixFromConfig reads the prefix from a beads config.yaml.
func (d *Discovery) readPrefixFromConfig(path string) string {
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "prefix:") {
			return strings.TrimSpace(strings.TrimPrefix(line, "prefix:"))
		}
	}
	return ""
}

// enrichRig adds issue counts to a rig.
func (d *Discovery) enrichRig(rig types.Rig) types.Rig {
	total, open, err := d.beadsClient.GetIssueCount(rig.Path)
	if err != nil {
		slog.Debug("Failed to get issue count", "rig", rig.Name, "error", err)
		return rig
	}

	rig.IssueCount = total
	rig.OpenCount = open

	// Get agent count
	agents, err := d.beadsClient.GetAgents(rig.Path)
	if err == nil {
		rig.AgentCount = len(agents)
	}

	return rig
}
