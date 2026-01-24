// Package beads provides a client for interacting with the bd CLI.
package beads

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

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

	// Ensure we return empty slice instead of nil (Go JSON encodes nil as null)
	if issues == nil {
		issues = []types.Issue{}
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

// GetAgents returns agents for a rig using beads + tmux session detection.
func (c *Client) GetAgents(rigPath string) ([]types.Agent, error) {
	// Get agents from beads/filesystem
	agents, err := c.getAgentsFromBeads(rigPath)
	if err != nil {
		return nil, err
	}

	// Enrich with last activity timestamps and hooked work from issues
	c.enrichAgentsFromIssues(rigPath, agents)

	// Enrich with running state from tmux sessions (fast, rig-scoped)
	c.enrichAgentsWithTmuxState(rigPath, agents)

	return agents, nil
}

// enrichAgentsFromIssues populates agent data from issues:
// - LastActivityAt: most recent activity timestamp
// - HookBead: currently assigned in_progress work
// - State: "working" if has in_progress work, otherwise from beads
func (c *Client) enrichAgentsFromIssues(rigPath string, agents []types.Agent) {
	// Skip if no agents
	if len(agents) == 0 {
		return
	}

	// Get all issues
	issues, err := c.ListIssues(rigPath, map[string]string{"all": "true"})
	if err != nil {
		slog.Debug("Failed to get issues for agent enrichment", "error", err)
		return
	}

	// Build maps for agent data
	lastActivity := make(map[string]time.Time)
	activeWork := make(map[string]string) // agent name -> in_progress issue ID

	for _, issue := range issues {
		if issue.Assignee == "" {
			continue
		}

		// Extract agent name from assignee (e.g., "townview/crew/jeremy" -> "jeremy")
		parts := strings.Split(issue.Assignee, "/")
		agentName := parts[len(parts)-1]

		// Track the most recent activity for this agent
		if existing, ok := lastActivity[agentName]; !ok || issue.UpdatedAt.After(existing) {
			lastActivity[agentName] = issue.UpdatedAt
		}

		// Track in_progress work as "hooked" work
		if issue.Status == "in_progress" {
			// Prefer the most recently updated in_progress issue
			if existingID, ok := activeWork[agentName]; ok {
				// Check if this issue is more recent
				for _, existingIssue := range issues {
					if existingIssue.ID == existingID && issue.UpdatedAt.After(existingIssue.UpdatedAt) {
						activeWork[agentName] = issue.ID
					}
				}
			} else {
				activeWork[agentName] = issue.ID
			}
		}
	}

	// Update agents with enriched data
	for i := range agents {
		name := agents[i].Name

		// Set last activity time
		if ts, ok := lastActivity[name]; ok {
			agents[i].LastActivityAt = &ts
		}

		// Set hooked bead (in_progress work)
		if beadID, ok := activeWork[name]; ok {
			agents[i].HookBead = beadID
			agents[i].State = "working"
		}
	}
}

// enrichAgentsWithTmuxState detects running agents by checking for active tmux sessions.
// This is a fast, rig-scoped alternative to calling gt status --json.
// Session naming pattern: gt-{rig}-{role} or gt-{rig}-crew-{name}
func (c *Client) enrichAgentsWithTmuxState(rigPath string, agents []types.Agent) {
	// Skip if no agents
	if len(agents) == 0 {
		return
	}

	// Get rig name from path
	rigName := rigPath
	if rigName == "." {
		rigName = "hq"
	}

	// Run tmux list-sessions with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "tmux", "list-sessions", "-F", "#{session_name}")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		// tmux might not be running or no sessions exist - that's fine
		slog.Debug("tmux list-sessions failed (may be no sessions)", "error", err)
		return
	}

	// Parse session names into a set for fast lookup
	sessionSet := make(map[string]bool)
	for _, line := range strings.Split(stdout.String(), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			sessionSet[line] = true
		}
	}

	// Check each agent for a matching tmux session
	for i := range agents {
		agent := &agents[i]

		// Build possible session names for this agent
		// Patterns: gt-{rig}-{role}, gt-{rig}-crew-{name}, gt-{rig}-{name}
		var possibleSessions []string

		switch agent.RoleType {
		case types.RoleWitness:
			possibleSessions = []string{
				fmt.Sprintf("gt-%s-witness", rigName),
			}
		case types.RoleRefinery:
			possibleSessions = []string{
				fmt.Sprintf("gt-%s-refinery", rigName),
			}
		case types.RoleCrew:
			possibleSessions = []string{
				fmt.Sprintf("gt-%s-crew-%s", rigName, agent.Name),
				fmt.Sprintf("gt-%s-%s", rigName, agent.Name),
			}
		case types.RolePolecat:
			possibleSessions = []string{
				fmt.Sprintf("gt-%s-%s", rigName, agent.Name),
				fmt.Sprintf("gt-%s-polecat-%s", rigName, agent.Name),
			}
		case types.RoleMayor:
			possibleSessions = []string{
				"gt-mayor",
				fmt.Sprintf("gt-%s-mayor", rigName),
			}
		case types.RoleDeacon:
			possibleSessions = []string{
				"gt-deacon",
				fmt.Sprintf("gt-%s-deacon", rigName),
			}
		default:
			// Generic pattern
			possibleSessions = []string{
				fmt.Sprintf("gt-%s-%s", rigName, agent.Name),
			}
		}

		// Check if any of the possible session names exist
		for _, sessionName := range possibleSessions {
			if sessionSet[sessionName] {
				// Agent has an active tmux session - mark as working if not already
				if agent.State == "idle" {
					agent.State = "working"
				}
				break
			}
		}
	}
}

// GetAgentHealth returns health indicators for the 3 main roles (witness, refinery, crew).
// Returns nil for roles that don't exist for this rig.
// Uses GetAgents which includes tmux session detection for accurate running state.
func (c *Client) GetAgentHealth(rigPath string) (*types.AgentHealth, error) {
	// Use GetAgents to include tmux session detection
	agents, err := c.GetAgents(rigPath)
	if err != nil {
		return nil, err
	}

	health := &types.AgentHealth{}
	for _, agent := range agents {
		state := agent.State
		switch agent.RoleType {
		case types.RoleWitness:
			health.Witness = &state
		case types.RoleRefinery:
			health.Refinery = &state
		case types.RoleCrew:
			// For crew, use the "best" state (working > idle)
			if health.Crew == nil || state == "working" {
				health.Crew = &state
			}
		}
	}

	return health, nil
}

// getAgentsFromStatus returns agents by parsing gt status --json output.
func (c *Client) getAgentsFromStatus(rigName string) ([]types.Agent, error) {
	// Run gt status --json from town root
	output, err := c.runGTFromRoot("status", "--json")
	if err != nil {
		return nil, fmt.Errorf("gt status failed: %w", err)
	}

	var status gtStatusOutput
	if err := json.Unmarshal(output, &status); err != nil {
		return nil, fmt.Errorf("failed to parse gt status output: %w", err)
	}

	// Find the rig
	var targetRig *gtStatusRig
	for i := range status.Rigs {
		if status.Rigs[i].Name == rigName {
			targetRig = &status.Rigs[i]
			break
		}
	}

	if targetRig == nil {
		// Rig not found - might be HQ (mayor/deacon)
		if rigName == "" || rigName == "hq" {
			return c.convertTopLevelAgents(status.Agents), nil
		}
		return nil, fmt.Errorf("rig not found: %s", rigName)
	}

	// Build hook lookup map for bead IDs
	hookMap := make(map[string]gtStatusHook)
	for _, hook := range targetRig.Hooks {
		hookMap[hook.Agent] = hook
	}

	// Convert rig agents to our Agent type
	agents := make([]types.Agent, 0, len(targetRig.Agents))
	for _, gtAgent := range targetRig.Agents {
		agent := c.convertGTAgent(gtAgent, hookMap)
		agents = append(agents, agent)
	}

	return agents, nil
}

// convertGTAgent converts a gt status agent to our Agent type.
func (c *Client) convertGTAgent(gtAgent gtStatusAgent, hookMap map[string]gtStatusHook) types.Agent {
	agent := types.Agent{
		ID:        gtAgent.Address,
		Name:      gtAgent.Name,
		RoleType:  mapGTRole(gtAgent.Role),
		UpdatedAt: timeNow(), // Use current time since gt status doesn't provide this
	}

	// Determine state from running status
	if gtAgent.Running {
		agent.State = "working"
	} else {
		agent.State = "idle"
	}

	// Check hook for work assignment
	if hook, ok := hookMap[gtAgent.Address]; ok && hook.HasWork {
		if hook.BeadID != "" {
			agent.HookBead = hook.BeadID
		} else {
			// Mark as having work even without specific bead ID
			agent.HookBead = "unknown"
		}
	}

	// Extract rig from address (e.g., "townview/witness" -> "townview")
	parts := strings.Split(gtAgent.Address, "/")
	if len(parts) > 0 {
		agent.Rig = parts[0]
	}

	return agent
}

// convertTopLevelAgents converts top-level agents (mayor, deacon) to Agent type.
func (c *Client) convertTopLevelAgents(gtAgents []gtStatusAgent) []types.Agent {
	agents := make([]types.Agent, 0, len(gtAgents))
	for _, gtAgent := range gtAgents {
		agent := types.Agent{
			ID:        gtAgent.Address,
			Name:      gtAgent.Name,
			RoleType:  mapGTRole(gtAgent.Role),
			Rig:       "hq",
			UpdatedAt: timeNow(),
		}
		if gtAgent.Running {
			agent.State = "working"
		} else {
			agent.State = "idle"
		}
		agents = append(agents, agent)
	}
	return agents
}

// mapGTRole maps gt status role names to our AgentRoleType values.
func mapGTRole(gtRole string) string {
	switch gtRole {
	case "coordinator":
		return "mayor"
	case "health-check":
		return "deacon"
	case "witness", "refinery", "polecat", "crew":
		return gtRole
	default:
		return gtRole
	}
}

// runGTFromRoot executes a gt command from the town root directory with a timeout.
func (c *Client) runGTFromRoot(args ...string) ([]byte, error) {
	gtPath := os.Getenv("GT_PATH")
	if gtPath == "" {
		gtPath = "gt"
	}

	// Create context with 5 second timeout to prevent hangs
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, gtPath, args...)
	cmd.Dir = c.townRoot

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Debug("Running gt command from root", "args", args, "dir", c.townRoot)

	if err := cmd.Run(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			slog.Warn("gt command timed out", "args", args)
			return nil, fmt.Errorf("command timed out after 5s")
		}
		slog.Error("gt command failed", "args", args, "stderr", stderr.String(), "error", err)
		return nil, fmt.Errorf("%s: %s", err, stderr.String())
	}

	return stdout.Bytes(), nil
}

// getAgentsFromBeads returns agents using beads + filesystem auto-discovery.
// Combines agent beads with filesystem scanning of crew/ and polecats/ directories.
// rigName is used to filter agents to only those belonging to this rig.
func (c *Client) getAgentsFromBeads(rigPath string) ([]types.Agent, error) {
	// Determine rig name from path for filtering
	rigName := rigPath
	if rigName == "." {
		rigName = "hq"
	}

	// Start with agents from beads
	agentMap := make(map[string]*types.Agent)

	args := []string{"list", "--json", "--type", "agent", "--all", "-n", "0"}
	output, err := c.runBD(rigPath, args...)
	if err == nil {
		var issues []types.Issue
		if err := json.Unmarshal(output, &issues); err == nil {
			for _, issue := range issues {
				agent := issueToAgent(issue)
				if agent != nil && agent.Rig == rigName {
					agentMap[agent.Name] = agent
				}
			}
		}
	}

	// Auto-discover agents from filesystem (crew/ and polecats/)
	rigFullPath := filepath.Join(c.townRoot, rigPath)
	if rigPath == "." {
		rigFullPath = c.townRoot
	}

	// Discover crew members
	crewDir := filepath.Join(rigFullPath, "crew")
	if entries, err := os.ReadDir(crewDir); err == nil {
		for _, entry := range entries {
			if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
				continue
			}
			name := entry.Name()
			if _, exists := agentMap[name]; !exists {
				// Create agent from filesystem discovery
				agentMap[name] = &types.Agent{
					ID:        fmt.Sprintf("%s-%s-crew-%s", getPrefix(rigName), rigName, name),
					Name:      name,
					RoleType:  types.RoleCrew,
					Rig:       rigName,
					State:     "idle", // Default state - no bead means idle
					UpdatedAt: time.Now(),
				}
			}
		}
	}

	// Discover polecats
	polecatsDir := filepath.Join(rigFullPath, "polecats")
	if entries, err := os.ReadDir(polecatsDir); err == nil {
		for _, entry := range entries {
			if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
				continue
			}
			name := entry.Name()
			if _, exists := agentMap[name]; !exists {
				agentMap[name] = &types.Agent{
					ID:        fmt.Sprintf("%s-%s-polecat-%s", getPrefix(rigName), rigName, name),
					Name:      name,
					RoleType:  types.RolePolecat,
					Rig:       rigName,
					State:     "idle",
					UpdatedAt: time.Now(),
				}
			}
		}
	}

	// Check for witness directory
	witnessDir := filepath.Join(rigFullPath, "witness")
	if _, err := os.Stat(witnessDir); err == nil {
		if _, exists := agentMap["witness"]; !exists {
			agentMap["witness"] = &types.Agent{
				ID:        fmt.Sprintf("%s-%s-witness", getPrefix(rigName), rigName),
				Name:      "witness",
				RoleType:  types.RoleWitness,
				Rig:       rigName,
				State:     "idle",
				UpdatedAt: time.Now(),
			}
		}
	}

	// Check for refinery directory
	refineryDir := filepath.Join(rigFullPath, "refinery")
	if _, err := os.Stat(refineryDir); err == nil {
		if _, exists := agentMap["refinery"]; !exists {
			agentMap["refinery"] = &types.Agent{
				ID:        fmt.Sprintf("%s-%s-refinery", getPrefix(rigName), rigName),
				Name:      "refinery",
				RoleType:  types.RoleRefinery,
				Rig:       rigName,
				State:     "idle",
				UpdatedAt: time.Now(),
			}
		}
	}

	// Discover polecats from tmux sessions (they may not have filesystem dirs)
	// Pattern: gt-{rig}-{name} where name is not a known role
	knownRoles := map[string]bool{
		"witness": true, "refinery": true, "mayor": true, "deacon": true,
	}
	prefix := fmt.Sprintf("gt-%s-", rigName)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "tmux", "list-sessions", "-F", "#{session_name}")
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	if err := cmd.Run(); err == nil {
		for _, line := range strings.Split(stdout.String(), "\n") {
			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, prefix) {
				continue
			}
			// Extract the name part after "gt-{rig}-"
			name := strings.TrimPrefix(line, prefix)
			if name == "" {
				continue
			}
			// Skip known singleton roles
			if knownRoles[name] {
				continue
			}
			// Skip crew- prefixed (handled separately)
			if strings.HasPrefix(name, "crew-") {
				continue
			}
			// Skip if already discovered
			if _, exists := agentMap[name]; exists {
				continue
			}
			// This is a polecat discovered from tmux
			agentMap[name] = &types.Agent{
				ID:        fmt.Sprintf("%s-%s-%s", getPrefix(rigName), rigName, name),
				Name:      name,
				RoleType:  types.RolePolecat,
				Rig:       rigName,
				State:     "working", // Running tmux session = working
				UpdatedAt: time.Now(),
			}
			slog.Debug("Discovered polecat from tmux", "rig", rigName, "name", name)
		}
	}

	// Convert map to slice
	agents := make([]types.Agent, 0, len(agentMap))
	for _, agent := range agentMap {
		agents = append(agents, *agent)
	}

	return agents, nil
}

// getPrefix returns a short prefix for agent IDs based on rig name.
func getPrefix(rigName string) string {
	if len(rigName) >= 2 {
		return strings.ToLower(rigName[:2])
	}
	return strings.ToLower(rigName)
}

// gtStatusOutput represents the gt status --json output.
type gtStatusOutput struct {
	Name     string           `json:"name"`
	Location string           `json:"location"`
	Agents   []gtStatusAgent  `json:"agents"` // Top-level agents (mayor, deacon)
	Rigs     []gtStatusRig    `json:"rigs"`
}

// gtStatusRig represents a rig in gt status --json output.
type gtStatusRig struct {
	Name        string          `json:"name"`
	Polecats    []string        `json:"polecats"`
	PolecatCount int            `json:"polecat_count"`
	Crews       []string        `json:"crews"`
	CrewCount   int             `json:"crew_count"`
	HasWitness  bool            `json:"has_witness"`
	HasRefinery bool            `json:"has_refinery"`
	Hooks       []gtStatusHook  `json:"hooks"`
	Agents      []gtStatusAgent `json:"agents"`
}

// gtStatusAgent represents an agent in gt status --json output.
type gtStatusAgent struct {
	Name       string `json:"name"`
	Address    string `json:"address"`
	Session    string `json:"session"`
	Role       string `json:"role"`
	Running    bool   `json:"running"`
	HasWork    bool   `json:"has_work"`
	UnreadMail int    `json:"unread_mail"`
}

// gtStatusHook represents a hook entry in gt status --json output.
type gtStatusHook struct {
	Agent   string `json:"agent"`
	Role    string `json:"role"`
	HasWork bool   `json:"has_work"`
	BeadID  string `json:"bead_id,omitempty"` // May be present if has_work is true
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

// runGT executes a gt command in the given rig path.
func (c *Client) runGT(rigPath string, args ...string) ([]byte, error) {
	gtPath := os.Getenv("GT_PATH")
	if gtPath == "" {
		gtPath = "gt"
	}

	// Create context with 5 second timeout to prevent hangs
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, gtPath, args...)
	cmd.Dir = filepath.Join(c.townRoot, rigPath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Debug("Running gt command", "args", args, "dir", cmd.Dir)

	if err := cmd.Run(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			slog.Warn("gt command timed out", "args", args)
			return nil, fmt.Errorf("command timed out after 5s")
		}
		slog.Error("gt command failed", "args", args, "stderr", stderr.String(), "error", err)
		return nil, fmt.Errorf("%s: %s", err, stderr.String())
	}

	return stdout.Bytes(), nil
}

// molProgressOutput represents the gt mol progress --json output.
type molProgressOutput struct {
	IssueID     string `json:"issue_id"`
	CurrentStep int    `json:"current_step"`
	TotalSteps  int    `json:"total_steps"`
	StepName    string `json:"step_name"`
	Status      string `json:"status"`
}

// GetMoleculeProgress returns the progress of a molecule.
func (c *Client) GetMoleculeProgress(rigPath, moleculeID string) (*types.MoleculeProgress, error) {
	args := []string{"mol", "progress", moleculeID, "--json"}

	output, err := c.runGT(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("gt mol progress failed: %w", err)
	}

	var progress molProgressOutput
	if err := json.Unmarshal(output, &progress); err != nil {
		return nil, fmt.Errorf("failed to parse molecule progress: %w", err)
	}

	return &types.MoleculeProgress{
		IssueID:     progress.IssueID,
		CurrentStep: progress.CurrentStep,
		TotalSteps:  progress.TotalSteps,
		StepName:    progress.StepName,
		Status:      progress.Status,
	}, nil
}

// PeekAgent returns output lines from an agent's session.
func (c *Client) PeekAgent(rigPath, agentID string, lineCount int) (*types.PeekOutput, error) {
	args := []string{"peek", agentID, fmt.Sprintf("%d", lineCount)}

	output, err := c.runGT(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("gt peek failed: %w", err)
	}

	lines := strings.Split(string(output), "\n")
	// Remove trailing empty line if present
	if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}

	return &types.PeekOutput{
		AgentID:   agentID,
		Lines:     lines,
		Timestamp: timeNow(),
	}, nil
}

// timeNow is a variable for testing purposes.
var timeNow = func() time.Time {
	return time.Now()
}

// GetRecentActivity returns recent activity events aggregated from issue updates.
func (c *Client) GetRecentActivity(rigPath string, limit int) ([]types.ActivityEvent, error) {
	// Get all issues sorted by updated_at
	issues, err := c.ListIssues(rigPath, map[string]string{"all": "true"})
	if err != nil {
		return nil, fmt.Errorf("failed to list issues: %w", err)
	}

	// Sort by updated_at descending
	sortIssuesByUpdatedAt(issues)

	// Take up to limit issues and convert to activity events
	events := make([]types.ActivityEvent, 0, limit)
	for i, issue := range issues {
		if i >= limit {
			break
		}
		event := types.ActivityEvent{
			ID:        fmt.Sprintf("activity-%s-%d", issue.ID, issue.UpdatedAt.Unix()),
			IssueID:   issue.ID,
			IssueType: issue.IssueType,
			Title:     issue.Title,
			EventType: "update",
			NewValue:  issue.Status,
			Actor:     issue.Assignee,
			Timestamp: issue.UpdatedAt,
		}
		events = append(events, event)
	}

	return events, nil
}

// sortIssuesByUpdatedAt sorts issues by updated_at descending (most recent first).
func sortIssuesByUpdatedAt(issues []types.Issue) {
	for i := 0; i < len(issues)-1; i++ {
		for j := i + 1; j < len(issues); j++ {
			if issues[j].UpdatedAt.After(issues[i].UpdatedAt) {
				issues[i], issues[j] = issues[j], issues[i]
			}
		}
	}
}

// runBDFromRoot executes a bd command from the town root directory.
// Used for cross-beads queries like convoy lookups.
func (c *Client) runBDFromRoot(args ...string) ([]byte, error) {
	beadsPath := filepath.Join(c.townRoot, ".beads")

	cmd := exec.Command(c.bdPath, args...)
	cmd.Dir = c.townRoot
	cmd.Env = append(os.Environ(), fmt.Sprintf("BD_DB=%s/beads.db", beadsPath))

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Debug("Running bd command from root", "args", args, "dir", c.townRoot)

	if err := cmd.Run(); err != nil {
		slog.Error("bd command failed", "args", args, "stderr", stderr.String(), "error", err)
		return nil, fmt.Errorf("%s: %s", err, stderr.String())
	}

	return stdout.Bytes(), nil
}

// GetIssueConvoy returns the convoy tracking this issue, or nil if none.
func (c *Client) GetIssueConvoy(issueID string) (*types.ConvoyInfo, error) {
	// Query town-level beads for convoy tracking this issue
	// bd dep list <issueID> --direction=up --type=tracks --json
	args := []string{"dep", "list", issueID, "--direction=up", "--type=tracks", "--json"}

	output, err := c.runBDFromRoot(args...)
	if err != nil {
		slog.Debug("No convoy tracking found", "issue_id", issueID, "error", err)
		return nil, nil // Not tracked by any convoy
	}

	if len(output) == 0 {
		return nil, nil // No tracking relationships
	}

	var trackers []types.Issue
	if err := json.Unmarshal(output, &trackers); err != nil {
		slog.Debug("Failed to parse trackers", "error", err)
		return nil, nil
	}

	// Filter for convoy type
	for _, tracker := range trackers {
		if tracker.IssueType == types.TypeConvoy {
			// Found a convoy, get its progress
			progress, err := c.GetConvoyProgress(tracker.ID)
			if err != nil {
				slog.Warn("Failed to get convoy progress", "convoy_id", tracker.ID, "error", err)
				progress = &types.ConvoyProgress{}
			}

			return &types.ConvoyInfo{
				ID:       tracker.ID,
				Title:    tracker.Title,
				Progress: *progress,
			}, nil
		}
	}

	return nil, nil // No convoy found
}

// GetConvoyProgress returns completion stats for a convoy.
func (c *Client) GetConvoyProgress(convoyID string) (*types.ConvoyProgress, error) {
	// Get all issues tracked by this convoy
	// bd dep list <convoyID> --direction=down --type=tracks --json
	args := []string{"dep", "list", convoyID, "--direction=down", "--type=tracks", "--json"}

	output, err := c.runBDFromRoot(args...)
	if err != nil {
		return &types.ConvoyProgress{}, nil // No tracked issues
	}

	if len(output) == 0 {
		return &types.ConvoyProgress{}, nil
	}

	var trackedIssues []types.Issue
	if err := json.Unmarshal(output, &trackedIssues); err != nil {
		return nil, fmt.Errorf("failed to parse tracked issues: %w", err)
	}

	// Count completed vs total
	total := len(trackedIssues)
	completed := 0
	for _, issue := range trackedIssues {
		if issue.Status == types.StatusClosed || issue.Status == types.StatusTombstone {
			completed++
		}
	}

	// Calculate percentage
	var percentage float64
	if total > 0 {
		percentage = float64(completed) / float64(total) * 100
	}

	return &types.ConvoyProgress{
		Completed:  completed,
		Total:      total,
		Percentage: percentage,
	}, nil
}
