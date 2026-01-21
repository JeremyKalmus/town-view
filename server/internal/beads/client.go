// Package beads provides a client for interacting with the bd CLI.
package beads

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gastown/townview/internal/types"
)

// Client wraps the bd CLI for issue operations.
type Client struct {
	townRoot string
	bdPath   string
}

// NewClient creates a new beads client.
func NewClient(townRoot string) *Client {
	bdPath := os.Getenv("BD_PATH")
	if bdPath == "" {
		bdPath = "bd"
	}
	return &Client{
		townRoot: townRoot,
		bdPath:   bdPath,
	}
}

// ListIssues returns issues for a rig with optional filters.
func (c *Client) ListIssues(rigPath string, filters map[string]string) ([]types.Issue, error) {
	args := []string{"list", "--json", "-n", "0"} // 0 = unlimited

	// Apply filters
	if status, ok := filters["status"]; ok && status != "" && status != "all" {
		args = append(args, "--status", status)
	}
	if issueType, ok := filters["type"]; ok && issueType != "" {
		args = append(args, "--type", issueType)
	}
	if priority, ok := filters["priority"]; ok && priority != "" {
		args = append(args, "--priority", priority)
	}
	if assignee, ok := filters["assignee"]; ok && assignee != "" {
		args = append(args, "--assignee", assignee)
	}
	if _, ok := filters["all"]; ok {
		args = append(args, "--all")
	}

	output, err := c.runBD(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("bd list failed: %w", err)
	}

	var issues []types.Issue
	if err := json.Unmarshal(output, &issues); err != nil {
		return nil, fmt.Errorf("failed to parse issues: %w", err)
	}

	return issues, nil
}

// GetIssue returns a single issue by ID.
func (c *Client) GetIssue(rigPath, issueID string) (*types.Issue, error) {
	args := []string{"show", issueID, "--json"}

	output, err := c.runBD(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("bd show failed: %w", err)
	}

	var issue types.Issue
	if err := json.Unmarshal(output, &issue); err != nil {
		return nil, fmt.Errorf("failed to parse issue: %w", err)
	}

	return &issue, nil
}

// UpdateIssue updates an issue with the given changes.
func (c *Client) UpdateIssue(rigPath, issueID string, update types.IssueUpdate) (*types.Issue, error) {
	args := []string{"update", issueID}

	if update.Status != nil {
		args = append(args, "--status", *update.Status)
	}
	if update.Priority != nil {
		args = append(args, "--priority", fmt.Sprintf("%d", *update.Priority))
	}
	if update.Title != nil {
		args = append(args, "--title", *update.Title)
	}
	if update.Description != nil {
		args = append(args, "--description", *update.Description)
	}
	if update.Assignee != nil {
		args = append(args, "--assignee", *update.Assignee)
	}
	if update.Labels != nil {
		for _, label := range *update.Labels {
			args = append(args, "--label", label)
		}
	}

	_, err := c.runBD(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("bd update failed: %w", err)
	}

	// Fetch updated issue
	return c.GetIssue(rigPath, issueID)
}

// GetAgents returns agent-type issues for a rig.
func (c *Client) GetAgents(rigPath string) ([]types.Agent, error) {
	args := []string{"list", "--json", "--type", "agent", "--all", "-n", "0"}

	output, err := c.runBD(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("bd list agents failed: %w", err)
	}

	var issues []types.Issue
	if err := json.Unmarshal(output, &issues); err != nil {
		return nil, fmt.Errorf("failed to parse agent issues: %w", err)
	}

	// Convert issues to agents
	agents := make([]types.Agent, 0, len(issues))
	for _, issue := range issues {
		agent := issueToAgent(issue)
		if agent != nil {
			agents = append(agents, *agent)
		}
	}

	return agents, nil
}

// countByStatusOutput represents the bd count --by-status --json output.
type countByStatusOutput struct {
	Total  int `json:"total"`
	Groups []struct {
		Group string `json:"group"`
		Count int    `json:"count"`
	} `json:"groups"`
}

// GetIssueCount returns counts by status for a rig.
func (c *Client) GetIssueCount(rigPath string) (total, open int, err error) {
	args := []string{"count", "--by-status", "--json"}

	output, err := c.runBD(rigPath, args...)
	if err != nil {
		// Fallback: count from list
		issues, listErr := c.ListIssues(rigPath, map[string]string{"all": "true"})
		if listErr != nil {
			return 0, 0, listErr
		}
		total = len(issues)
		for _, issue := range issues {
			if issue.Status == types.StatusOpen || issue.Status == types.StatusInProgress {
				open++
			}
		}
		return total, open, nil
	}

	var counts countByStatusOutput
	if err := json.Unmarshal(output, &counts); err != nil {
		return 0, 0, fmt.Errorf("failed to parse counts: %w", err)
	}

	total = counts.Total
	for _, g := range counts.Groups {
		if g.Group == "open" || g.Group == "in_progress" {
			open += g.Count
		}
	}
	return total, open, nil
}

// runBD executes a bd command in the given rig path.
func (c *Client) runBD(rigPath string, args ...string) ([]byte, error) {
	beadsPath := filepath.Join(c.townRoot, rigPath, ".beads")

	// Check if beads directory exists
	if _, err := os.Stat(beadsPath); os.IsNotExist(err) {
		// Try town-level beads
		beadsPath = filepath.Join(c.townRoot, ".beads")
	}

	cmd := exec.Command(c.bdPath, args...)
	cmd.Dir = filepath.Join(c.townRoot, rigPath)
	cmd.Env = append(os.Environ(), fmt.Sprintf("BD_DB=%s/beads.db", beadsPath))

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Debug("Running bd command", "args", args, "dir", cmd.Dir)

	if err := cmd.Run(); err != nil {
		slog.Error("bd command failed", "args", args, "stderr", stderr.String(), "error", err)
		return nil, fmt.Errorf("%s: %s", err, stderr.String())
	}

	return stdout.Bytes(), nil
}

// issueToAgent converts an agent-type issue to an Agent struct.
func issueToAgent(issue types.Issue) *types.Agent {
	if issue.IssueType != types.TypeAgent {
		return nil
	}

	agent := &types.Agent{
		ID:        issue.ID,
		Name:      extractAgentName(issue.ID),
		UpdatedAt: issue.UpdatedAt,
	}

	// Parse structured fields from description
	for _, line := range strings.Split(issue.Description, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		colonIdx := strings.Index(line, ":")
		if colonIdx == -1 {
			continue
		}
		key := strings.TrimSpace(line[:colonIdx])
		value := strings.TrimSpace(line[colonIdx+1:])

		switch strings.ToLower(key) {
		case "role_type":
			agent.RoleType = value
		case "rig":
			agent.Rig = value
		case "agent_state":
			agent.State = value
		case "hook_bead":
			if value != "null" && value != "" {
				agent.HookBead = value
			}
		}
	}

	return agent
}

// extractAgentName gets the agent name from its ID.
// E.g., "gt-gastown-polecat-furiosa" -> "furiosa"
func extractAgentName(id string) string {
	parts := strings.Split(id, "-")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return id
}

// graphNode represents a node in the bd graph JSON output.
type graphNode struct {
	Issue     types.Issue `json:"Issue"`
	Layer     int         `json:"Layer"`
	Position  int         `json:"Position"`
	DependsOn []string    `json:"DependsOn"`
}

// graphLayout represents the layout in bd graph JSON output.
type graphLayout struct {
	Nodes map[string]graphNode `json:"Nodes"`
}

// graphOutput represents the bd graph --all --json output.
type graphOutput struct {
	Layout graphLayout `json:"layout"`
}

// graphComponentOutput represents a single component in bd graph --all --json output.
type graphComponentOutput struct {
	Root   types.Issue `json:"Root"`
	Issues []types.Issue `json:"Issues"`
}

// GetIssueDependencies returns blockers and blocked-by for a specific issue.
func (c *Client) GetIssueDependencies(rigPath, issueID string) (*types.IssueDependencies, error) {
	result := &types.IssueDependencies{
		Blockers:  []types.Issue{},
		BlockedBy: []types.Issue{},
	}

	// Get blockers (what this issue depends on) - direction=down
	blockersArgs := []string{"dep", "list", issueID, "--direction=down", "--json"}
	blockersOutput, err := c.runBD(rigPath, blockersArgs...)
	if err == nil && len(blockersOutput) > 0 {
		var blockers []types.Issue
		if jsonErr := json.Unmarshal(blockersOutput, &blockers); jsonErr == nil {
			result.Blockers = blockers
		}
	}

	// Get blocked-by (what depends on this issue) - direction=up
	blockedByArgs := []string{"dep", "list", issueID, "--direction=up", "--json"}
	blockedByOutput, err := c.runBD(rigPath, blockedByArgs...)
	if err == nil && len(blockedByOutput) > 0 {
		var blockedBy []types.Issue
		if jsonErr := json.Unmarshal(blockedByOutput, &blockedBy); jsonErr == nil {
			result.BlockedBy = blockedBy
		}
	}

	return result, nil
}

// AddDependency adds a dependency: blockerID blocks issueID.
func (c *Client) AddDependency(rigPath, issueID, blockerID string) error {
	args := []string{"dep", "add", issueID, blockerID}
	_, err := c.runBD(rigPath, args...)
	if err != nil {
		return fmt.Errorf("bd dep add failed: %w", err)
	}
	return nil
}

// RemoveDependency removes a dependency: blockerID no longer blocks issueID.
func (c *Client) RemoveDependency(rigPath, issueID, blockerID string) error {
	args := []string{"dep", "remove", issueID, blockerID}
	_, err := c.runBD(rigPath, args...)
	if err != nil {
		return fmt.Errorf("bd dep remove failed: %w", err)
	}
	return nil
}

// GetDependencies returns all dependency relationships for a rig.
func (c *Client) GetDependencies(rigPath string) ([]types.Dependency, error) {
	args := []string{"graph", "--all", "--json"}

	output, err := c.runBD(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("bd graph failed: %w", err)
	}

	// Try parsing as array of components first (bd graph --all format)
	var components []graphComponentOutput
	if err := json.Unmarshal(output, &components); err == nil && len(components) > 0 {
		// Need to get individual issue dependencies from bd dep list
		// For now, return empty since --all format doesn't include DependsOn
		slog.Debug("Graph returned component format, need per-issue dependencies")
	}

	// Try parsing as single graph with layout
	var graph graphOutput
	if err := json.Unmarshal(output, &graph); err != nil {
		// Try parsing as component array and extracting dependencies differently
		slog.Debug("Failed to parse graph output, returning empty dependencies", "error", err)
		return []types.Dependency{}, nil
	}

	// Extract dependencies from nodes
	var deps []types.Dependency
	for id, node := range graph.Layout.Nodes {
		for _, depID := range node.DependsOn {
			deps = append(deps, types.Dependency{
				FromID: id,      // This issue depends on...
				ToID:   depID,   // ...this issue (arrow points from depID to id)
				Type:   "blocks", // depID blocks id
			})
		}
	}

	return deps, nil
}
