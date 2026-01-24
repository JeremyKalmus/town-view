package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gastown/townview/internal/beads"
	"github.com/gastown/townview/internal/mail"
	"github.com/gastown/townview/internal/rigs"
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
	Type     string           `json:"type"`
	Rigs     []types.Rig      `json:"rigs"`
	Agents   []types.Agent    `json:"agents"`
	Issues   []types.Issue    `json:"issues"`
	Mail     []types.Mail     `json:"mail"`
	Activity []types.ActivityEvent `json:"activity"`
}

// WebSocketHandler handles WebSocket connections.
type WebSocketHandler struct {
	hub          *websocket.Hub
	rigDiscovery *rigs.Discovery
	beadsClient  *beads.Client
	mailClient   *mail.Client
}

// NewWebSocketHandler creates a new WebSocketHandler.
func NewWebSocketHandler(rigDiscovery *rigs.Discovery, beadsClient *beads.Client, mailClient *mail.Client) *WebSocketHandler {
	h := &WebSocketHandler{
		rigDiscovery: rigDiscovery,
		beadsClient:  beadsClient,
		mailClient:   mailClient,
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
	snapshot := Snapshot{
		Type:     "snapshot",
		Rigs:     []types.Rig{},
		Agents:   []types.Agent{},
		Issues:   []types.Issue{},
		Mail:     []types.Mail{},
		Activity: []types.ActivityEvent{},
	}

	// Get all rigs
	rigList, err := h.rigDiscovery.ListRigs()
	if err != nil {
		slog.Error("Failed to list rigs for snapshot", "error", err)
	} else {
		snapshot.Rigs = rigList
	}

	// Get agents and issues for each rig
	for _, rig := range snapshot.Rigs {
		// Get agents
		agents, err := h.beadsClient.GetAgents(rig.Path)
		if err != nil {
			slog.Debug("Failed to get agents for rig", "rig", rig.ID, "error", err)
		} else {
			snapshot.Agents = append(snapshot.Agents, agents...)
		}

		// Get issues (open only by default)
		issues, err := h.beadsClient.ListIssues(rig.Path, nil)
		if err != nil {
			slog.Debug("Failed to get issues for rig", "rig", rig.ID, "error", err)
		} else {
			snapshot.Issues = append(snapshot.Issues, issues...)
		}

		// Get recent activity
		activity, err := h.beadsClient.GetRecentActivity(rig.Path, 20)
		if err != nil {
			slog.Debug("Failed to get activity for rig", "rig", rig.ID, "error", err)
		} else {
			snapshot.Activity = append(snapshot.Activity, activity...)
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
