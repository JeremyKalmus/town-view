// Package handlers provides HTTP request handlers.
package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
)

// EventBroadcaster is implemented by services that manage SSE client connections.
type EventBroadcaster interface {
	// Register adds a client channel and returns it for receiving events.
	Register() <-chan interface{}
	// Unregister removes a client channel.
	Unregister(ch <-chan interface{})
}

// EventsHandler handles the SSE endpoint.
type EventsHandler struct {
	broadcaster EventBroadcaster
}

// NewEventsHandler creates a new EventsHandler.
func NewEventsHandler(broadcaster EventBroadcaster) *EventsHandler {
	return &EventsHandler{broadcaster: broadcaster}
}

// ServeHTTP handles GET /api/events
func (h *EventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering

	// Ensure response writer supports flushing
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Register this client with the broadcaster
	events := h.broadcaster.Register()
	defer h.broadcaster.Unregister(events)

	slog.Info("SSE client connected", "remote_addr", r.RemoteAddr)
	defer slog.Info("SSE client disconnected", "remote_addr", r.RemoteAddr)

	// Stream events until client disconnects
	for {
		select {
		case <-r.Context().Done():
			// Client disconnected
			return
		case event, ok := <-events:
			if !ok {
				// Channel closed
				return
			}

			// Marshal event to JSON
			data, err := json.Marshal(event)
			if err != nil {
				slog.Error("Failed to marshal SSE event", "error", err)
				continue
			}

			// Write SSE format: "data: {json}\n\n"
			if _, err := fmt.Fprintf(w, "data: %s\n\n", data); err != nil {
				slog.Error("Failed to write SSE event", "error", err)
				return
			}

			flusher.Flush()
		}
	}
}
