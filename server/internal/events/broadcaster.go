// Package events provides Server-Sent Events (SSE) functionality for real-time updates.
package events

import (
	"encoding/json"
	"log/slog"
	"sync"
)

// Client represents an SSE client channel.
type Client chan []byte

// Broadcaster manages SSE client connections and broadcasts events.
type Broadcaster struct {
	clients    map[Client]bool
	broadcast  chan interface{}
	register   chan Client
	unregister chan Client
	mu         sync.RWMutex
}

// NewBroadcaster creates a new SSE event broadcaster.
func NewBroadcaster() *Broadcaster {
	return &Broadcaster{
		clients:    make(map[Client]bool),
		broadcast:  make(chan interface{}, 256),
		register:   make(chan Client),
		unregister: make(chan Client),
	}
}

// Run starts the broadcaster's event loop.
func (b *Broadcaster) Run() {
	for {
		select {
		case client := <-b.register:
			b.mu.Lock()
			b.clients[client] = true
			b.mu.Unlock()
			slog.Debug("SSE client connected", "total", len(b.clients))

		case client := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[client]; ok {
				delete(b.clients, client)
				close(client)
			}
			b.mu.Unlock()
			slog.Debug("SSE client disconnected", "total", len(b.clients))

		case message := <-b.broadcast:
			data, err := json.Marshal(message)
			if err != nil {
				slog.Error("Failed to marshal broadcast message", "error", err)
				continue
			}

			b.mu.RLock()
			for client := range b.clients {
				select {
				case client <- data:
				default:
					// Client buffer full, will be cleaned up
				}
			}
			b.mu.RUnlock()
		}
	}
}

// Register adds a client to the broadcaster.
func (b *Broadcaster) Register(client Client) {
	b.register <- client
}

// Unregister removes a client from the broadcaster.
func (b *Broadcaster) Unregister(client Client) {
	b.unregister <- client
}

// Broadcast sends a message to all connected clients.
func (b *Broadcaster) Broadcast(message interface{}) {
	select {
	case b.broadcast <- message:
	default:
		slog.Warn("Broadcast channel full, dropping message")
	}
}
