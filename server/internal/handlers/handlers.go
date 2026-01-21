// Package handlers provides HTTP request handlers.
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gastown/townview/internal/beads"
	"github.com/gastown/townview/internal/rigs"
	"github.com/gastown/townview/internal/types"
	"github.com/gastown/townview/internal/ws"
)

// Handlers holds the HTTP handlers and their dependencies.
type Handlers struct {
	rigDiscovery *rigs.Discovery
	beadsClient  *beads.Client
	wsHub        *ws.Hub
}

// New creates a new Handlers instance.
func New(rigDiscovery *rigs.Discovery, beadsClient *beads.Client, wsHub *ws.Hub) *Handlers {
	return &Handlers{
		rigDiscovery: rigDiscovery,
		beadsClient:  beadsClient,
		wsHub:        wsHub,
	}
}

// ListRigs handles GET /api/rigs
func (h *Handlers) ListRigs(w http.ResponseWriter, r *http.Request) {
	rigs, err := h.rigDiscovery.ListRigs()
	if err != nil {
		slog.Error("Failed to list rigs", "error", err)
		http.Error(w, "Failed to list rigs", http.StatusInternalServerError)
		return
	}

	writeJSON(w, rigs)
}

// GetRig handles GET /api/rigs/{rigId}
func (h *Handlers) GetRig(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil {
		slog.Error("Failed to get rig", "rigId", rigID, "error", err)
		http.Error(w, "Failed to get rig", http.StatusInternalServerError)
		return
	}

	if rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	writeJSON(w, rig)
}

// ListIssues handles GET /api/rigs/{rigId}/issues
func (h *Handlers) ListIssues(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	// Parse filters from query params
	filters := make(map[string]string)
	if status := r.URL.Query().Get("status"); status != "" {
		filters["status"] = status
	}
	if issueType := r.URL.Query().Get("type"); issueType != "" {
		filters["type"] = issueType
	}
	if priority := r.URL.Query().Get("priority"); priority != "" {
		filters["priority"] = priority
	}
	if assignee := r.URL.Query().Get("assignee"); assignee != "" {
		filters["assignee"] = assignee
	}
	if r.URL.Query().Get("all") == "true" {
		filters["all"] = "true"
	}

	issues, err := h.beadsClient.ListIssues(rig.Path, filters)
	if err != nil {
		slog.Error("Failed to list issues", "rigId", rigID, "error", err)
		http.Error(w, "Failed to list issues", http.StatusInternalServerError)
		return
	}

	writeJSON(w, issues)
}

// GetIssue handles GET /api/rigs/{rigId}/issues/{issueId}
func (h *Handlers) GetIssue(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	issue, err := h.beadsClient.GetIssue(rig.Path, issueID)
	if err != nil {
		slog.Error("Failed to get issue", "rigId", rigID, "issueId", issueID, "error", err)
		http.Error(w, "Failed to get issue", http.StatusInternalServerError)
		return
	}

	writeJSON(w, issue)
}

// UpdateIssue handles PATCH /api/rigs/{rigId}/issues/{issueId}
func (h *Handlers) UpdateIssue(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	var update types.IssueUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	issue, err := h.beadsClient.UpdateIssue(rig.Path, issueID, update)
	if err != nil {
		slog.Error("Failed to update issue", "rigId", rigID, "issueId", issueID, "error", err)
		http.Error(w, "Failed to update issue", http.StatusInternalServerError)
		return
	}

	// Broadcast change
	h.wsHub.Broadcast(types.WSMessage{
		Type:    "issue_changed",
		Rig:     rigID,
		Payload: issue,
	})

	writeJSON(w, issue)
}

// ListAgents handles GET /api/rigs/{rigId}/agents
func (h *Handlers) ListAgents(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	agents, err := h.beadsClient.GetAgents(rig.Path)
	if err != nil {
		slog.Error("Failed to list agents", "rigId", rigID, "error", err)
		http.Error(w, "Failed to list agents", http.StatusInternalServerError)
		return
	}

	writeJSON(w, agents)
}

// GetIssueDependencies handles GET /api/rigs/{rigId}/issues/{issueId}/dependencies
func (h *Handlers) GetIssueDependencies(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	deps, err := h.beadsClient.GetIssueDependencies(rig.Path, issueID)
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

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	var req types.DependencyAdd
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.BlockerID == "" {
		http.Error(w, "blocker_id is required", http.StatusBadRequest)
		return
	}

	if err := h.beadsClient.AddDependency(rig.Path, issueID, req.BlockerID); err != nil {
		slog.Error("Failed to add dependency", "rigId", rigID, "issueId", issueID, "blockerId", req.BlockerID, "error", err)
		http.Error(w, "Failed to add dependency", http.StatusInternalServerError)
		return
	}

	// Broadcast change
	h.wsHub.Broadcast(types.WSMessage{
		Type: "issue_changed",
		Rig:  rigID,
		Payload: map[string]string{
			"id":         issueID,
			"blocker_id": req.BlockerID,
			"action":     "dependency_added",
		},
	})

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, map[string]string{"status": "ok"})
}

// RemoveIssueDependency handles DELETE /api/rigs/{rigId}/issues/{issueId}/dependencies/{blockerId}
func (h *Handlers) RemoveIssueDependency(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")
	issueID := r.PathValue("issueId")
	blockerID := r.PathValue("blockerId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	if err := h.beadsClient.RemoveDependency(rig.Path, issueID, blockerID); err != nil {
		slog.Error("Failed to remove dependency", "rigId", rigID, "issueId", issueID, "blockerId", blockerID, "error", err)
		http.Error(w, "Failed to remove dependency", http.StatusInternalServerError)
		return
	}

	// Broadcast change
	h.wsHub.Broadcast(types.WSMessage{
		Type: "issue_changed",
		Rig:  rigID,
		Payload: map[string]string{
			"id":         issueID,
			"blocker_id": blockerID,
			"action":     "dependency_removed",
		},
	})

	w.WriteHeader(http.StatusOK)
	writeJSON(w, map[string]string{"status": "ok"})
}

// ListDependencies handles GET /api/rigs/{rigId}/dependencies
func (h *Handlers) ListDependencies(w http.ResponseWriter, r *http.Request) {
	rigID := r.PathValue("rigId")

	rig, err := h.rigDiscovery.GetRig(rigID)
	if err != nil || rig == nil {
		http.Error(w, "Rig not found", http.StatusNotFound)
		return
	}

	deps, err := h.beadsClient.GetDependencies(rig.Path)
	if err != nil {
		slog.Error("Failed to list dependencies", "rigId", rigID, "error", err)
		http.Error(w, "Failed to list dependencies", http.StatusInternalServerError)
		return
	}

	writeJSON(w, deps)
}

// WebSocket handles GET /ws
func (h *Handlers) WebSocket(w http.ResponseWriter, r *http.Request) {
	h.wsHub.ServeWS(w, r)
}

// writeJSON writes a JSON response.
func writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("Failed to encode JSON response", "error", err)
	}
}
