// Package events provides Server-Sent Events (SSE) functionality for real-time updates.
package events

import (
	"log/slog"
	"sync"
)

// client represents an SSE client channel.
type client chan interface{}

// Broadcaster manages SSE client connections and broadcasts events.
type Broadcaster struct {
	clients    map[client]bool
	broadcast  chan interface{}
	register   chan client
	unregister chan client
	mu         sync.RWMutex
}

// NewBroadcaster creates a new SSE event broadcaster.
func NewBroadcaster() *Broadcaster {
	return &Broadcaster{
		clients:    make(map[client]bool),
		broadcast:  make(chan interface{}, 256),
		register:   make(chan client),
		unregister: make(chan client),
	}
}

// Run starts the broadcaster's event loop.
func (b *Broadcaster) Run() {
	for {
		select {
		case c := <-b.register:
			b.mu.Lock()
			b.clients[c] = true
			b.mu.Unlock()
			slog.Debug("SSE client connected", "total", len(b.clients))

		case c := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[c]; ok {
				delete(b.clients, c)
				close(c)
			}
			b.mu.Unlock()
			slog.Debug("SSE client disconnected", "total", len(b.clients))

		case message := <-b.broadcast:
			b.mu.RLock()
			for c := range b.clients {
				select {
				case c <- message:
				default:
					// Client buffer full, will be cleaned up
				}
			}
			b.mu.RUnlock()
		}
	}
}

// Register creates a new client channel, registers it, and returns it for receiving events.
func (b *Broadcaster) Register() <-chan interface{} {
	c := make(client, 256)
	b.register <- c
	return c
}

// Unregister removes a client from the broadcaster.
func (b *Broadcaster) Unregister(ch <-chan interface{}) {
	// Find the bidirectional channel that matches this receive-only channel
	b.mu.Lock()
	for c := range b.clients {
		if (<-chan interface{})(c) == ch {
			b.mu.Unlock()
			b.unregister <- c
			return
		}
	}
	b.mu.Unlock()
}

// Broadcast sends a message to all connected clients.
func (b *Broadcaster) Broadcast(message interface{}) {
	select {
	case b.broadcast <- message:
	default:
		slog.Warn("Broadcast channel full, dropping message")
	}
}
