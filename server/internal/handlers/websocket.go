package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gastown/townview/internal/events"
	"github.com/gastown/townview/internal/mail"
	"github.com/gastown/townview/internal/query"
	"github.com/gastown/townview/internal/registry"
	"github.com/gastown/townview/internal/rigmanager"
	"github.com/gastown/townview/internal/types"
	"github.com/gastown/townview/internal/websocket"
	gorillaws "github.com/gorilla/websocket"
)

var upgrader = gorillaws.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		return true
	},
}

// Snapshot represents a full data snapshot sent to WebSocket clients.
type Snapshot struct {
	Type       string                `json:"type"`
	Rigs       []types.Rig           `json:"rigs"`
	Agents     []types.Agent         `json:"agents"`
	Issues     []types.Issue         `json:"issues"`
	Mail       []types.Mail          `json:"mail"`
	Activity   []types.ActivityEvent `json:"activity"`
	CacheStats query.CacheStats      `json:"cache_stats"`
}

// WebSocketHandler handles WebSocket connections.
type WebSocketHandler struct {
	hub           *websocket.Hub
	rigManager    *rigmanager.Manager
	eventStore    *events.Store
	agentRegistry *registry.Registry
	mailClient    *mail.Client
}

// NewWebSocketHandler creates a new WebSocketHandler.
func NewWebSocketHandler(rigManager *rigmanager.Manager, eventStore *events.Store, agentRegistry *registry.Registry, mailClient *mail.Client) *WebSocketHandler {
	h := &WebSocketHandler{
		rigManager:    rigManager,
		eventStore:    eventStore,
		agentRegistry: agentRegistry,
		mailClient:    mailClient,
	}
	h.hub = websocket.NewHub(h.buildSnapshot)
	return h
}

// Hub returns the WebSocket hub.
func (h *WebSocketHandler) Hub() *websocket.Hub {
	return h.hub
}

// ServeHTTP handles WebSocket upgrade requests.
func (h *WebSocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("Failed to upgrade WebSocket connection", "error", err)
		return
	}

	client := websocket.NewClient(h.hub, conn)
	h.hub.Register(client)

	// Start client goroutines
	go client.WritePump()
	go client.ReadPump()
}

// buildSnapshot creates a full data snapshot for broadcasting.
func (h *WebSocketHandler) buildSnapshot() ([]byte, error) {
	// Get cache stats from townview rig's query service
	var cacheStats query.CacheStats
	if rig, err := h.rigManager.GetRig("townview"); err == nil && rig.QueryService != nil {
		cacheStats = rig.QueryService.GetCacheStats()
	}

	snapshot := Snapshot{
		Type:       "snapshot",
		Rigs:       []types.Rig{},
		Agents:     []types.Agent{},
		Issues:     []types.Issue{},
		Mail:       []types.Mail{},
		Activity:   []types.ActivityEvent{},
		CacheStats: cacheStats,
	}

	// Get all rigs from RigManager (uses Service Layer)
	snapshot.Rigs = h.rigManager.ListRigs()

	// Get all issues from all rigs
	issues := h.rigManager.ListAllIssues(query.IssueFilter{})

	// Enrich convoy-type issues with progress data and dependencies
	for i, issue := range issues {
		if issue.IssueType == types.TypeConvoy && issue.RigID != "" {
			// Get convoy progress
			progress, err := h.rigManager.GetConvoyProgress(issue.RigID, issue.ID)
			if err == nil && progress != nil {
				issues[i].Convoy = &types.ConvoyInfo{
					ID:       issue.ID,
					Title:    issue.Title,
					Progress: *progress,
				}
			}

			// Get raw dependencies for convoy children resolution
			deps, err := h.rigManager.GetRawDependencies(issue.RigID, issue.ID)
			if err == nil && len(deps) > 0 {
				issues[i].Dependencies = deps
			}
		}
	}
	snapshot.Issues = issues

	// Get all agents from Agent Registry
	agents := h.agentRegistry.ListAgents(nil)
	for _, agent := range agents {
		a := types.Agent{
			ID:        agent.ID,
			Name:      agent.Name,
			RoleType:  string(agent.Role),
			Rig:       agent.Rig,
			State:     string(agent.Status),
			UpdatedAt: agent.LastHeartbeat,
		}
		if agent.CurrentBead != nil {
			a.HookBead = *agent.CurrentBead
		}
		snapshot.Agents = append(snapshot.Agents, a)
	}

	// Get recent activity from Event Store
	activityEvents, err := h.eventStore.Query(events.EventFilter{
		Limit: 50,
	})
	if err != nil {
		slog.Debug("Failed to get activity for snapshot", "error", err)
	} else {
		for _, evt := range activityEvents {
			// Parse payload for additional fields
			var payload map[string]interface{}
			if len(evt.Payload) > 0 {
				json.Unmarshal(evt.Payload, &payload)
			}

			issueID, _ := payload["issue_id"].(string)
			title, _ := payload["title"].(string)

			snapshot.Activity = append(snapshot.Activity, types.ActivityEvent{
				ID:        fmt.Sprintf("%d", evt.ID),
				IssueID:   issueID,
				EventType: evt.Type,
				Title:     title,
				Actor:     evt.Source,
				Timestamp: evt.Timestamp,
			})
		}
	}

	// Get mail (town-level)
	opts := mail.ListMailOptions{Limit: 20}
	messages, err := h.mailClient.ListMail("", opts)
	if err != nil {
		slog.Debug("Failed to get mail for snapshot", "error", err)
	} else {
		snapshot.Mail = messages
	}

	return json.Marshal(snapshot)
}
