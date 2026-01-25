// Package handlers provides HTTP request handlers.
package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gastown/townview/internal/events"
	"github.com/gastown/townview/internal/mail"
	"github.com/gastown/townview/internal/query"
	"github.com/gastown/townview/internal/registry"
	"github.com/gastown/townview/internal/rigmanager"
	"github.com/gastown/townview/internal/telemetry"
	"github.com/gastown/townview/internal/types"
)

// Handlers holds the HTTP handlers and their dependencies.
type Handlers struct {
	rigManager         *rigmanager.Manager
	eventStore         *events.Store
	agentRegistry      *registry.Registry
	mailClient         *mail.Client
	telemetryCollector telemetry.Collector
	townRoot           string
}

// New creates a new Handlers instance.
func New(rigManager *rigmanager.Manager, eventStore *events.Store, agentRegistry *registry.Registry, mailClient *mail.Client, telemetryCollector telemetry.Collector, townRoot string) *Handlers {
	return &Handlers{
		rigManager:         rigManager,
		eventStore:         eventStore,
		agentRegistry:      agentRegistry,
		mailClient:         mailClient,
		telemetryCollector: telemetryCollector,
		townRoot:           townRoot,
	}
}

// ListRigs handles GET /api/rigs
func (h *Handlers) ListRigs(w http.ResponseWriter, r *http.Request) {
	rigs := h.rigManager.ListRigs()
	writeJSON(w, rigs)
}

// GetRig handles GET /api/rigs/{rigId}
func (h *Handlers) GetRig(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	rig, err := h.rigManager.GetRig(rigID)
	if err != nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	// Convert to types.Rig
	result := types.Rig{
		ID:        rig.ID,
		Name:      rig.Name,
		Prefix:    rig.Prefix,
		Path:      rig.Path,
		BeadsPath: rig.BeadsPath,
	}

	writeJSON(w, result)
}

// ListIssues handles GET /api/rigs/{rigId}/issues
func (h *Handlers) ListIssues(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	// Build filter from query params
	filter := query.IssueFilter{}

	if status := r.URL.Query().Get("status"); status != "" && status != "all" {
		filter.Status = []string{status}
	}
	if issueType := r.URL.Query().Get("type"); issueType != "" {
		filter.Type = []string{issueType}
	}
	if assignee := r.URL.Query().Get("assignee"); assignee != "" {
		filter.Assignee = assignee
	}

	// Handle multiple types (comma-separated)
	if typeFilter := r.URL.Query().Get("types"); typeFilter != "" {
		filter.Type = strings.Split(typeFilter, ",")
		for i := range filter.Type {
			filter.Type[i] = strings.TrimSpace(filter.Type[i])
		}
	}

	issues, err := h.rigManager.ListIssues(rigID, filter)
	if err != nil {
		slog.Error("Failed to list issues", "rigId", rigID, "error", err)
		http.Error(w, "Failed to list issues", http.StatusInternalServerError)
		return
	}

	// Ensure we return empty array not null
	if issues == nil {
		issues = []types.Issue{}
	}

	writeJSON(w, issues)
}

// GetIssue handles GET /api/rigs/{rigId}/issues/{issueId}
func (h *Handlers) GetIssue(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	issue, err := h.rigManager.GetIssue(rigID, issueID)
	if err != nil {
		slog.Error("Failed to get issue", "rigId", rigID, "issueId", issueID, "error", err)
		http.Error(w, "Failed to get issue", http.StatusInternalServerError)
		return
	}

	if issue == nil {
		http.Error(w, "Issue not found", http.StatusNotFound)
		return
	}

	writeJSON(w, issue)
}

// UpdateIssue handles PATCH /api/rigs/{rigId}/issues/{issueId}
// This uses CLI for write operations (Query Service is read-only)
func (h *Handlers) UpdateIssue(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	var update types.IssueUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build bd update command
	args := []string{"update", issueID}
	if update.Status != nil {
		args = append(args, "--status", *update.Status)
	}
	if update.Priority != nil {
		args = append(args, "--priority", strconv.Itoa(*update.Priority))
	}
	if update.Title != nil {
		args = append(args, "--title", *update.Title)
	}
	if update.Assignee != nil {
		args = append(args, "--assignee", *update.Assignee)
	}

	// Execute bd update
	if err := h.runBD(rigID, args...); err != nil {
		slog.Error("Failed to update issue", "rigId", rigID, "issueId", issueID, "error", err)
		http.Error(w, "Failed to update issue", http.StatusInternalServerError)
		return
	}

	// Refresh cache and return updated issue
	h.rigManager.RefreshRig(rigID)

	issue, err := h.rigManager.GetIssue(rigID, issueID)
	if err != nil {
		http.Error(w, "Failed to get updated issue", http.StatusInternalServerError)
		return
	}

	// Emit event
	if h.eventStore != nil {
		h.eventStore.Emit("bead.updated", "townview/server", rigID, map[string]interface{}{
			"issue_id": issueID,
			"rig":      rigID,
		})
	}

	writeJSON(w, issue)
}

// ListAgents handles GET /api/rigs/{rigId}/agents
func (h *Handlers) ListAgents(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	if h.agentRegistry == nil {
		writeJSON(w, []types.Agent{})
		return
	}

	agents := h.agentRegistry.ListAgents(&registry.AgentFilter{Rig: &rigID})

	// Convert to types.Agent
	result := make([]types.Agent, 0, len(agents))
	for _, a := range agents {
		agent := types.Agent{
			ID:        a.ID,
			Name:      a.Name,
			RoleType:  string(a.Role),
			Rig:       a.Rig,
			State:     string(a.Status),
			UpdatedAt: a.LastHeartbeat,
		}
		if a.CurrentBead != nil {
			agent.HookBead = *a.CurrentBead
		}
		result = append(result, agent)
	}

	writeJSON(w, result)
}

// GetIssueDependencies handles GET /api/rigs/{rigId}/issues/{issueId}/dependencies
func (h *Handlers) GetIssueDependencies(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	deps, err := h.rigManager.GetDependencies(rigID, issueID)
	if err != nil {
		slog.Error("Failed to get issue dependencies", "rigId", rigID, "issueId", issueID, "error", err)
		http.Error(w, "Failed to get issue dependencies", http.StatusInternalServerError)
		return
	}

	writeJSON(w, deps)
}

// AddIssueDependency handles POST /api/rigs/{rigId}/issues/{issueId}/dependencies
func (h *Handlers) AddIssueDependency(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	var req types.DependencyAdd
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.BlockerID == "" {
		http.Error(w, "blocker_id is required", http.StatusBadRequest)
		return
	}

	// Use bd dep add
	if err := h.runBD(rigID, "dep", "add", issueID, req.BlockerID); err != nil {
		slog.Error("Failed to add dependency", "rigId", rigID, "issueId", issueID, "blockerId", req.BlockerID, "error", err)
		http.Error(w, "Failed to add dependency", http.StatusInternalServerError)
		return
	}

	// Refresh cache
	h.rigManager.RefreshRig(rigID)

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]string{"status": "ok"})
}

// RemoveIssueDependency handles DELETE /api/rigs/{rigId}/issues/{issueId}/dependencies/{blockerId}
func (h *Handlers) RemoveIssueDependency(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")
	blockerID := r.PathValue("blockerId")

	// Use bd dep remove
	if err := h.runBD(rigID, "dep", "remove", issueID, blockerID); err != nil {
		slog.Error("Failed to remove dependency", "rigId", rigID, "issueId", issueID, "blockerId", blockerID, "error", err)
		http.Error(w, "Failed to remove dependency", http.StatusInternalServerError)
		return
	}

	// Refresh cache
	h.rigManager.RefreshRig(rigID)

	w.WriteHeader(http.StatusOK)
	writeJSON(w, map[string]string{"status": "ok"})
}

// ListDependencies handles GET /api/rigs/{rigId}/dependencies
func (h *Handlers) ListDependencies(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	// Get all issues and their dependencies
	issues, err := h.rigManager.ListIssues(rigID, query.IssueFilter{})
	if err != nil {
		slog.Error("Failed to list dependencies", "rigId", rigID, "error", err)
		http.Error(w, "Failed to list dependencies", http.StatusInternalServerError)
		return
	}

	// Build dependency list
	var deps []types.Dependency
	for _, issue := range issues {
		if issue.DependencyCount > 0 {
			issueDeps, err := h.rigManager.GetDependencies(rigID, issue.ID)
			if err == nil && issueDeps != nil {
				for _, blocker := range issueDeps.Blockers {
					deps = append(deps, types.Dependency{
						FromID: issue.ID,
						ToID:   blocker.ID,
						Type:   "blocks",
					})
				}
			}
		}
	}

	if deps == nil {
		deps = []types.Dependency{}
	}

	writeJSON(w, deps)
}

// GetMoleculeProgress handles GET /api/rigs/{rigId}/issues/{issueId}/progress
func (h *Handlers) GetMoleculeProgress(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	progress, err := h.rigManager.GetConvoyProgress(rigID, issueID)
	if err != nil {
		slog.Error("Failed to get molecule progress", "rigId", rigID, "issueId", issueID, "error", err)
		http.Error(w, "Failed to get molecule progress", http.StatusInternalServerError)
		return
	}

	writeJSON(w, progress)
}

// PeekAgent handles GET /api/rigs/{rigId}/agents/{agentId}/peek
// This requires tmux access, uses gt peek command
func (h *Handlers) PeekAgent(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	agentID := r.PathValue("agentId")

	// Parse lines query param (default: 50)
	lines := 50
	if linesStr := r.URL.Query().Get("lines"); linesStr != "" {
		if parsed, err := strconv.Atoi(linesStr); err == nil && parsed > 0 {
			lines = parsed
		}
	}

	// Build session name based on agent
	sessionName := "gt-" + rigID + "-" + agentID

	// Use tmux capture-pane
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "tmux", "capture-pane", "-t", sessionName, "-p", "-S", strconv.Itoa(-lines))
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		slog.Debug("Failed to peek agent", "session", sessionName, "error", err, "stderr", stderr.String())
		// Return empty output instead of error
		writeJSON(w, types.PeekOutput{
			AgentID:   agentID,
			Lines:     []string{},
			Timestamp: time.Now(),
		})
		return
	}

	output := strings.Split(strings.TrimRight(stdout.String(), "\n"), "\n")

	writeJSON(w, types.PeekOutput{
		AgentID:   agentID,
		Lines:     output,
		Timestamp: time.Now(),
	})
}

// GetRecentActivity handles GET /api/rigs/{rigId}/activity
func (h *Handlers) GetRecentActivity(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	// Parse limit query param (default: 50)
	limit := 50
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if h.eventStore == nil {
		writeJSON(w, []types.ActivityEvent{})
		return
	}

	// Query events from event store
	eventList, err := h.eventStore.Query(events.EventFilter{
		Rig:   rigID,
		Limit: limit,
	})
	if err != nil {
		slog.Error("Failed to get recent activity", "rigId", rigID, "error", err)
		http.Error(w, "Failed to get recent activity", http.StatusInternalServerError)
		return
	}

	// Convert to ActivityEvent format
	activity := make([]types.ActivityEvent, 0, len(eventList))
	for _, e := range eventList {
		// Extract fields from payload (json.RawMessage)
		var payload map[string]interface{}
		if len(e.Payload) > 0 {
			json.Unmarshal(e.Payload, &payload)
		}

		issueID, _ := payload["issue_id"].(string)
		title, _ := payload["title"].(string)
		oldValue, _ := payload["old_value"].(string)
		newValue, _ := payload["new_value"].(string)

		activity = append(activity, types.ActivityEvent{
			ID:        strconv.FormatInt(e.ID, 10),
			IssueID:   issueID,
			EventType: e.Type,
			Title:     title,
			OldValue:  oldValue,
			NewValue:  newValue,
			Actor:     e.Source,
			Timestamp: e.Timestamp,
		})
	}

	writeJSON(w, activity)
}

// GetAgentMail handles GET /api/rigs/{rigId}/agents/{agentId}/mail
func (h *Handlers) GetAgentMail(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	agentID := r.PathValue("agentId")

	// Build agent address from agentID
	var agentAddress string
	if agentID == "witness" || agentID == "refinery" {
		agentAddress = rigID + "/" + agentID
	} else if len(agentID) > 5 && agentID[:5] == "crew/" {
		agentAddress = rigID + "/" + agentID
	} else {
		agentAddress = rigID + "/crew/" + agentID
	}

	// Parse limit (default 10)
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	rig, err := h.rigManager.GetRig(rigID)
	if err != nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	opts := mail.ListMailOptions{
		Limit:   limit,
		Address: agentAddress,
	}

	messages, err := h.mailClient.ListMail(rig.Path, opts)
	if err != nil {
		// Try polecats prefix
		opts.Address = rigID + "/polecats/" + agentID
		messages, err = h.mailClient.ListMail(rig.Path, opts)
		if err != nil {
			writeJSON(w, []interface{}{})
			return
		}
	}

	writeJSON(w, messages)
}

// GetMailMessage handles GET /api/mail/{mailId}
func (h *Handlers) GetMailMessage(w http.ResponseWriter, r *http.Request) {
	mailID := r.PathValue("mailId")

	message, err := h.mailClient.GetMail("", mailID)
	if err != nil {
		slog.Error("Failed to get mail message", "mailId", mailID, "error", err)
		http.Error(w, "Failed to get mail message", http.StatusInternalServerError)
		return
	}

	writeJSON(w, message)
}

// ListMail handles GET /api/mail
func (h *Handlers) ListMail(w http.ResponseWriter, r *http.Request) {
	opts := mail.ListMailOptions{
		Limit: 50,
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			opts.Limit = parsed
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			opts.Offset = parsed
		}
	}

	if r.URL.Query().Get("unread_only") == "true" {
		opts.UnreadOnly = true
	}

	messages, err := h.mailClient.ListMail("", opts)
	if err != nil {
		slog.Error("Failed to list mail", "error", err)
		http.Error(w, "Failed to list mail", http.StatusInternalServerError)
		return
	}

	writeJSON(w, messages)
}

// ListRigMail handles GET /api/rigs/{rigId}/mail
func (h *Handlers) ListRigMail(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	rig, err := h.rigManager.GetRig(rigID)
	if err != nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	opts := mail.ListMailOptions{
		Limit: 50,
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			opts.Limit = parsed
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			opts.Offset = parsed
		}
	}

	if r.URL.Query().Get("unread_only") == "true" {
		opts.UnreadOnly = true
	}

	messages, err := h.mailClient.ListMail(rig.Path, opts)
	if err != nil {
		slog.Error("Failed to list rig mail", "rigId", rigID, "error", err)
		http.Error(w, "Failed to list mail", http.StatusInternalServerError)
		return
	}

	writeJSON(w, messages)
}

// GetTestSuiteStatus handles GET /api/telemetry/tests
// Returns the current status of all tests with their last_passed info.
func (h *Handlers) GetTestSuiteStatus(w http.ResponseWriter, r *http.Request) {
	if h.telemetryCollector == nil {
		writeJSON(w, []telemetry.TestStatus{})
		return
	}

	status, err := h.telemetryCollector.GetTestSuiteStatus()
	if err != nil {
		slog.Error("Failed to get test suite status", "error", err)
		http.Error(w, "Failed to get test suite status", http.StatusInternalServerError)
		return
	}

	writeJSON(w, status)
}

// GetRegressions handles GET /api/telemetry/regressions
// Returns tests that have regressed (were passing, now failing).
func (h *Handlers) GetRegressions(w http.ResponseWriter, r *http.Request) {
	if h.telemetryCollector == nil {
		writeJSON(w, []telemetry.TestRegression{})
		return
	}

	// Parse 'since' query param (timestamp filter)
	since := r.URL.Query().Get("since")

	regressions, err := h.telemetryCollector.GetRegressions(since)
	if err != nil {
		slog.Error("Failed to get regressions", "error", err)
		http.Error(w, "Failed to get regressions", http.StatusInternalServerError)
		return
	}

	writeJSON(w, regressions)
}


// GetTokenSummary handles GET /api/telemetry/tokens/summary
// Returns aggregated token usage statistics with optional filtering.
func (h *Handlers) GetTokenSummary(w http.ResponseWriter, r *http.Request) {
	if h.telemetryCollector == nil {
		writeJSON(w, telemetry.TokenSummary{
			ByModel: make(map[string]telemetry.TokenModelSummary),
			ByAgent: make(map[string]telemetry.TokenModelSummary),
		})
		return
	}

	// Build filter from query params
	filter := telemetry.TelemetryFilter{
		AgentID: r.URL.Query().Get("agent_id"),
		BeadID:  r.URL.Query().Get("bead_id"),
		Since:   r.URL.Query().Get("since"),
		Until:   r.URL.Query().Get("until"),
	}

	summary, err := h.telemetryCollector.GetTokenSummary(filter)
	if err != nil {
		slog.Error("Failed to get token summary", "error", err)
		http.Error(w, "Failed to get token summary", http.StatusInternalServerError)
		return
	}

	writeJSON(w, summary)
}

// CreateTestRun handles POST /api/telemetry/tests
// Accepts TestRun JSON payload and records it via the telemetry collector.
func (h *Handlers) CreateTestRun(w http.ResponseWriter, r *http.Request) {
	if h.telemetryCollector == nil {
		http.Error(w, "Telemetry collector not configured", http.StatusServiceUnavailable)
		return
	}

	var run telemetry.TestRun
	if err := json.NewDecoder(r.Body).Decode(&run); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if run.AgentID == "" {
		http.Error(w, "agent_id is required", http.StatusBadRequest)
		return
	}
	if run.Command == "" {
		http.Error(w, "command is required", http.StatusBadRequest)
		return
	}
	if len(run.Results) == 0 {
		http.Error(w, "results is required and must not be empty", http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if run.Timestamp == "" {
		run.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	// Record the test run
	if err := h.telemetryCollector.RecordTestRun(run); err != nil {
		slog.Error("Failed to record test run", "error", err)
		http.Error(w, "Failed to record test run", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]string{"status": "created"})
}

// runBD executes a bd CLI command for write operations
func (h *Handlers) runBD(rigID string, args ...string) error {
	rig, err := h.rigManager.GetRig(rigID)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "bd", args...)
	cmd.Dir = rig.AbsPath

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		slog.Error("bd command failed", "args", args, "stderr", stderr.String(), "error", err)
		return err
	}

	return nil
}

// writeJSON writes a JSON response.
func writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("Failed to encode JSON response", "error", err)
	}
}
