package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gastown/townview/internal/types"
)

// mockBroadcaster implements EventBroadcaster for testing.
type mockBroadcaster struct {
	mu       sync.Mutex
	clients  []chan interface{}
	messages []interface{}
}

func newMockBroadcaster() *mockBroadcaster {
	return &mockBroadcaster{
		clients:  make([]chan interface{}, 0),
		messages: make([]interface{}, 0),
	}
}

func (m *mockBroadcaster) Register() <-chan interface{} {
	m.mu.Lock()
	defer m.mu.Unlock()
	ch := make(chan interface{}, 10)
	m.clients = append(m.clients, ch)
	return ch
}

func (m *mockBroadcaster) Unregister(ch <-chan interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, c := range m.clients {
		// Compare channel addresses
		if (<-chan interface{})(c) == ch {
			m.clients = append(m.clients[:i], m.clients[i+1:]...)
			close(c)
			return
		}
	}
}

func (m *mockBroadcaster) Broadcast(msg interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messages = append(m.messages, msg)
	for _, ch := range m.clients {
		select {
		case ch <- msg:
		default:
			// Skip if channel is full
		}
	}
}

func (m *mockBroadcaster) ClientCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.clients)
}

func TestEventsHandler_SetsSSEHeaders(t *testing.T) {
	broadcaster := newMockBroadcaster()
	handler := NewEventsHandler(broadcaster)

	// Create a context that we can cancel to end the request
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodGet, "/api/events", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	// Run handler in goroutine since it blocks
	done := make(chan struct{})
	go func() {
		handler.ServeHTTP(rec, req)
		close(done)
	}()

	// Give handler time to set headers
	time.Sleep(10 * time.Millisecond)

	// Cancel request to stop handler
	cancel()
	<-done

	// Check headers
	if got := rec.Header().Get("Content-Type"); got != "text/event-stream" {
		t.Errorf("Content-Type = %q, want %q", got, "text/event-stream")
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-cache" {
		t.Errorf("Cache-Control = %q, want %q", got, "no-cache")
	}
	if got := rec.Header().Get("Connection"); got != "keep-alive" {
		t.Errorf("Connection = %q, want %q", got, "keep-alive")
	}
}

func TestEventsHandler_BroadcastEventsToAllConnectedClients(t *testing.T) {
	broadcaster := newMockBroadcaster()
	handler := NewEventsHandler(broadcaster)

	// Create a context that we can cancel
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodGet, "/api/events", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	// Run handler in goroutine
	done := make(chan struct{})
	go func() {
		handler.ServeHTTP(rec, req)
		close(done)
	}()

	// Wait for client to register
	time.Sleep(10 * time.Millisecond)

	// Verify client registered
	if count := broadcaster.ClientCount(); count != 1 {
		t.Fatalf("expected 1 client, got %d", count)
	}

	// Broadcast a test message
	testMsg := types.WSMessage{
		Type: "beads_changed",
		Rig:  "test-rig",
		Payload: map[string]string{
			"issue_id": "test-123",
		},
	}
	broadcaster.Broadcast(testMsg)

	// Give time for message to be written
	time.Sleep(10 * time.Millisecond)

	// Cancel request
	cancel()
	<-done

	// Parse the response body
	body := rec.Body.String()
	if !strings.HasPrefix(body, "data: ") {
		t.Fatalf("expected body to start with 'data: ', got %q", body)
	}
	if !strings.HasSuffix(body, "\n\n") {
		t.Fatalf("expected body to end with '\\n\\n', got %q", body)
	}

	// Extract JSON data
	jsonStr := strings.TrimPrefix(body, "data: ")
	jsonStr = strings.TrimSuffix(jsonStr, "\n\n")

	var received types.WSMessage
	if err := json.Unmarshal([]byte(jsonStr), &received); err != nil {
		t.Fatalf("failed to unmarshal message: %v", err)
	}

	if received.Type != testMsg.Type {
		t.Errorf("Type = %q, want %q", received.Type, testMsg.Type)
	}
	if received.Rig != testMsg.Rig {
		t.Errorf("Rig = %q, want %q", received.Rig, testMsg.Rig)
	}
}

func TestEventsHandler_CleanupClientWhenConnectionCloses(t *testing.T) {
	broadcaster := newMockBroadcaster()
	handler := NewEventsHandler(broadcaster)

	// Create a context that we can cancel
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodGet, "/api/events", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	// Run handler in goroutine
	done := make(chan struct{})
	go func() {
		handler.ServeHTTP(rec, req)
		close(done)
	}()

	// Wait for client to register
	time.Sleep(10 * time.Millisecond)
	if count := broadcaster.ClientCount(); count != 1 {
		t.Fatalf("expected 1 client after connect, got %d", count)
	}

	// Simulate client disconnect
	cancel()
	<-done

	// Give unregister time to process
	time.Sleep(10 * time.Millisecond)

	// Verify client was unregistered
	if count := broadcaster.ClientCount(); count != 0 {
		t.Errorf("expected 0 clients after disconnect, got %d", count)
	}
}

func TestEventsHandler_SSEMessageFormat(t *testing.T) {
	broadcaster := newMockBroadcaster()
	handler := NewEventsHandler(broadcaster)

	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodGet, "/api/events", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		handler.ServeHTTP(rec, req)
		close(done)
	}()

	time.Sleep(10 * time.Millisecond)

	// Test all event types
	eventTypes := []string{
		"beads_changed",
		"mail_received",
		"issue_changed",
		"convoy_progress_changed",
	}

	for _, eventType := range eventTypes {
		broadcaster.Broadcast(types.WSMessage{
			Type: eventType,
			Rig:  "test-rig",
		})
	}

	time.Sleep(10 * time.Millisecond)
	cancel()
	<-done

	// Verify all messages were formatted correctly
	body := rec.Body.String()
	scanner := bufio.NewScanner(strings.NewReader(body))

	messageCount := 0
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data: ") {
			messageCount++
			jsonStr := strings.TrimPrefix(line, "data: ")
			var msg types.WSMessage
			if err := json.Unmarshal([]byte(jsonStr), &msg); err != nil {
				t.Errorf("failed to unmarshal message %d: %v", messageCount, err)
			}
		}
	}

	if messageCount != len(eventTypes) {
		t.Errorf("expected %d messages, got %d", len(eventTypes), messageCount)
	}
}

func TestEventsHandler_MultipleClients(t *testing.T) {
	broadcaster := newMockBroadcaster()
	handler := NewEventsHandler(broadcaster)

	// Connect multiple clients
	const numClients = 3
	ctxs := make([]context.Context, numClients)
	cancels := make([]context.CancelFunc, numClients)
	recs := make([]*httptest.ResponseRecorder, numClients)
	dones := make([]chan struct{}, numClients)

	for i := 0; i < numClients; i++ {
		ctxs[i], cancels[i] = context.WithCancel(context.Background())
		req := httptest.NewRequest(http.MethodGet, "/api/events", nil).WithContext(ctxs[i])
		recs[i] = httptest.NewRecorder()
		dones[i] = make(chan struct{})

		go func(idx int, req *http.Request, rec *httptest.ResponseRecorder) {
			handler.ServeHTTP(rec, req)
			close(dones[idx])
		}(i, req, recs[i])
	}

	// Wait for all clients to register
	time.Sleep(20 * time.Millisecond)

	if count := broadcaster.ClientCount(); count != numClients {
		t.Fatalf("expected %d clients, got %d", numClients, count)
	}

	// Broadcast a message
	testMsg := types.WSMessage{Type: "beads_changed", Rig: "test-rig"}
	broadcaster.Broadcast(testMsg)
	time.Sleep(10 * time.Millisecond)

	// Cancel all clients
	for i := 0; i < numClients; i++ {
		cancels[i]()
	}
	for i := 0; i < numClients; i++ {
		<-dones[i]
	}

	// Verify all clients received the message
	for i, rec := range recs {
		body := rec.Body.String()
		if !strings.Contains(body, "beads_changed") {
			t.Errorf("client %d did not receive message, body: %q", i, body)
		}
	}
}
