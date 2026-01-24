// Package websocket provides WebSocket functionality for Town View.
package websocket

import (
	"log/slog"
	"os"
	"strconv"
	"sync"
	"time"
)

// Hub maintains the set of active clients and broadcasts messages to them.
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from clients
	broadcast chan []byte

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Snapshot provider function
	snapshotProvider func() ([]byte, error)

	// Broadcast interval
	broadcastInterval time.Duration

	// Mutex for client operations
	mu sync.RWMutex
}

// NewHub creates a new Hub instance.
func NewHub(snapshotProvider func() ([]byte, error)) *Hub {
	interval := 10 * time.Second
	if envInterval := os.Getenv("WS_BROADCAST_INTERVAL"); envInterval != "" {
		if seconds, err := strconv.Atoi(envInterval); err == nil && seconds > 0 {
			interval = time.Duration(seconds) * time.Second
		}
	}

	return &Hub{
		clients:           make(map[*Client]bool),
		broadcast:         make(chan []byte, 256),
		register:          make(chan *Client),
		unregister:        make(chan *Client),
		snapshotProvider:  snapshotProvider,
		broadcastInterval: interval,
	}
}

// Run starts the hub's main loop.
func (h *Hub) Run() {
	ticker := time.NewTicker(h.broadcastInterval)
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			slog.Debug("WebSocket client registered", "addr", client.conn.RemoteAddr())

			// Send immediate snapshot to new client
			go h.sendSnapshotToClient(client)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			slog.Debug("WebSocket client unregistered", "addr", client.conn.RemoteAddr())

		case message := <-h.broadcast:
			h.broadcastMessage(message)

		case <-ticker.C:
			h.broadcastSnapshot()
		}
	}
}

// broadcastMessage sends a message to all connected clients.
func (h *Hub) broadcastMessage(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			// Client buffer full, close connection
			close(client.send)
			delete(h.clients, client)
		}
	}
}

// broadcastSnapshot fetches current data and broadcasts to all clients.
func (h *Hub) broadcastSnapshot() {
	if h.snapshotProvider == nil {
		return
	}

	snapshot, err := h.snapshotProvider()
	if err != nil {
		slog.Error("Failed to get snapshot for broadcast", "error", err)
		return
	}

	h.broadcastMessage(snapshot)
}

// sendSnapshotToClient sends current snapshot to a specific client.
func (h *Hub) sendSnapshotToClient(client *Client) {
	if h.snapshotProvider == nil {
		return
	}

	snapshot, err := h.snapshotProvider()
	if err != nil {
		slog.Error("Failed to get snapshot for new client", "error", err)
		return
	}

	select {
	case client.send <- snapshot:
	default:
		// Client buffer full
	}
}

// TriggerBroadcast triggers an immediate broadcast to all clients.
func (h *Hub) TriggerBroadcast() {
	go h.broadcastSnapshot()
}

// ClientCount returns the number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Register adds a client to the hub.
func (h *Hub) Register(client *Client) {
	h.register <- client
}
