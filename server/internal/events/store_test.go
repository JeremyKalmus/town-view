package events

import (
	"testing"
	"time"
)

func TestEventStore_Emit_PersistsToDatabase(t *testing.T) {
	// AC-1: Events are persisted to SQLite
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Emit an event
	payload := map[string]string{"key": "value"}
	err = store.Emit("test.event", "test-source", "test-rig", payload)
	if err != nil {
		t.Fatalf("Failed to emit event: %v", err)
	}

	// Query to verify persistence
	events, err := store.Query(EventFilter{})
	if err != nil {
		t.Fatalf("Failed to query events: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}

	e := events[0]
	if e.Type != "test.event" {
		t.Errorf("Expected type 'test.event', got '%s'", e.Type)
	}
	if e.Source != "test-source" {
		t.Errorf("Expected source 'test-source', got '%s'", e.Source)
	}
	if e.Rig != "test-rig" {
		t.Errorf("Expected rig 'test-rig', got '%s'", e.Rig)
	}
	if e.ID == 0 {
		t.Error("Event should have an ID after persistence")
	}
	if e.Timestamp.IsZero() {
		t.Error("Event should have a timestamp")
	}
}

func TestEventStore_Query_FiltersByTypeAndTime(t *testing.T) {
	// AC-2: Events can be queried by type and time range
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Emit events of different types
	store.Emit("type.alpha", "source1", "rig1", nil)
	store.Emit("type.beta", "source1", "rig1", nil)
	store.Emit("type.alpha", "source2", "rig1", nil)

	// Query by type
	events, err := store.Query(EventFilter{Type: "type.alpha"})
	if err != nil {
		t.Fatalf("Failed to query events: %v", err)
	}

	if len(events) != 2 {
		t.Fatalf("Expected 2 alpha events, got %d", len(events))
	}
	for _, e := range events {
		if e.Type != "type.alpha" {
			t.Errorf("Expected type 'type.alpha', got '%s'", e.Type)
		}
	}

	// Query by source
	events, err = store.Query(EventFilter{Source: "source2"})
	if err != nil {
		t.Fatalf("Failed to query events: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("Expected 1 event from source2, got %d", len(events))
	}
}

func TestEventStore_Query_FiltersByTimeRange(t *testing.T) {
	// AC-2 continued: Time range filtering
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Emit some events
	store.Emit("event1", "src", "rig", nil)
	time.Sleep(10 * time.Millisecond)
	midPoint := time.Now().UTC()
	time.Sleep(10 * time.Millisecond)
	store.Emit("event2", "src", "rig", nil)
	store.Emit("event3", "src", "rig", nil)

	// Query events after midpoint
	events, err := store.Query(EventFilter{StartTime: &midPoint})
	if err != nil {
		t.Fatalf("Failed to query events: %v", err)
	}

	if len(events) != 2 {
		t.Fatalf("Expected 2 events after midpoint, got %d", len(events))
	}

	// Query events before midpoint
	events, err = store.Query(EventFilter{EndTime: &midPoint})
	if err != nil {
		t.Fatalf("Failed to query events: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("Expected 1 event before midpoint, got %d", len(events))
	}
}

func TestEventStore_Subscribe_ReceivesEvents(t *testing.T) {
	// AC-3: Subscribers receive real-time events
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Subscribe to all events
	ch := store.Subscribe(EventFilter{})

	// Emit an event
	go func() {
		time.Sleep(10 * time.Millisecond)
		store.Emit("realtime.event", "src", "rig", map[string]int{"count": 42})
	}()

	// Wait for event
	select {
	case event := <-ch:
		if event.Type != "realtime.event" {
			t.Errorf("Expected type 'realtime.event', got '%s'", event.Type)
		}
		if event.Source != "src" {
			t.Errorf("Expected source 'src', got '%s'", event.Source)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Timeout waiting for event")
	}

	store.Unsubscribe(ch)
}

func TestEventStore_Subscribe_FiltersEvents(t *testing.T) {
	// AC-3 continued: Filtered subscriptions
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Subscribe only to specific type
	ch := store.Subscribe(EventFilter{Type: "target.type"})

	// Emit events
	go func() {
		time.Sleep(10 * time.Millisecond)
		store.Emit("other.type", "src", "rig", nil)
		store.Emit("target.type", "src", "rig", nil)
	}()

	// Should only receive the matching event
	select {
	case event := <-ch:
		if event.Type != "target.type" {
			t.Errorf("Expected type 'target.type', got '%s'", event.Type)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Timeout waiting for filtered event")
	}

	// Verify no more events
	select {
	case event := <-ch:
		t.Errorf("Unexpected event received: %v", event)
	case <-time.After(50 * time.Millisecond):
		// Expected - no more events
	}

	store.Unsubscribe(ch)
}

func TestEventStore_Replay_FromTimestamp(t *testing.T) {
	// AC-4: Events can be replayed from timestamp
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Emit some historical events
	store.Emit("history.1", "src", "rig", nil)
	store.Emit("history.2", "src", "rig", nil)

	time.Sleep(10 * time.Millisecond)
	replayPoint := time.Now().UTC()
	time.Sleep(10 * time.Millisecond)

	store.Emit("history.3", "src", "rig", nil)
	store.Emit("history.4", "src", "rig", nil)

	// Replay from replayPoint
	events, err := store.Replay(replayPoint, EventFilter{})
	if err != nil {
		t.Fatalf("Failed to replay events: %v", err)
	}

	if len(events) != 2 {
		t.Fatalf("Expected 2 events in replay, got %d", len(events))
	}

	// Verify events are in order
	if events[0].Type != "history.3" {
		t.Errorf("Expected first replay event to be 'history.3', got '%s'", events[0].Type)
	}
	if events[1].Type != "history.4" {
		t.Errorf("Expected second replay event to be 'history.4', got '%s'", events[1].Type)
	}
}

func TestEventStore_Replay_WithFilter(t *testing.T) {
	// AC-4 continued: Replay with filtering
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	replayPoint := time.Now().UTC()
	time.Sleep(10 * time.Millisecond)

	// Emit events of different types
	store.Emit("target", "src", "rig1", nil)
	store.Emit("other", "src", "rig1", nil)
	store.Emit("target", "src", "rig2", nil)

	// Replay only target events from rig1
	events, err := store.Replay(replayPoint, EventFilter{Type: "target", Rig: "rig1"})
	if err != nil {
		t.Fatalf("Failed to replay events: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("Expected 1 filtered replay event, got %d", len(events))
	}
	if events[0].Type != "target" || events[0].Rig != "rig1" {
		t.Errorf("Unexpected event: type=%s, rig=%s", events[0].Type, events[0].Rig)
	}
}

func TestEventStore_MultipleSubscribers(t *testing.T) {
	// Test that multiple subscribers all receive events
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	ch1 := store.Subscribe(EventFilter{})
	ch2 := store.Subscribe(EventFilter{})

	// Emit event
	go func() {
		time.Sleep(10 * time.Millisecond)
		store.Emit("broadcast.event", "src", "rig", nil)
	}()

	// Both should receive
	for i, ch := range []<-chan Event{ch1, ch2} {
		select {
		case event := <-ch:
			if event.Type != "broadcast.event" {
				t.Errorf("Subscriber %d: Expected 'broadcast.event', got '%s'", i+1, event.Type)
			}
		case <-time.After(100 * time.Millisecond):
			t.Errorf("Subscriber %d: Timeout waiting for event", i+1)
		}
	}

	store.Unsubscribe(ch1)
	store.Unsubscribe(ch2)
}

func TestEventStore_QueryWithLimit(t *testing.T) {
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Emit multiple events
	for i := 0; i < 10; i++ {
		store.Emit("event", "src", "rig", nil)
	}

	// Query with limit
	events, err := store.Query(EventFilter{Limit: 5})
	if err != nil {
		t.Fatalf("Failed to query with limit: %v", err)
	}

	if len(events) != 5 {
		t.Errorf("Expected 5 events with limit, got %d", len(events))
	}
}

func TestEventStore_PayloadPersistence(t *testing.T) {
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Emit with complex payload
	payload := map[string]interface{}{
		"string": "hello",
		"number": 42,
		"nested": map[string]string{"inner": "value"},
	}
	store.Emit("payload.test", "src", "rig", payload)

	// Query and verify payload
	events, err := store.Query(EventFilter{})
	if err != nil {
		t.Fatalf("Failed to query: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}

	if events[0].Payload == nil {
		t.Error("Payload should not be nil")
	}

	// Payload should be valid JSON
	payloadStr := string(events[0].Payload)
	if payloadStr == "" {
		t.Error("Payload should not be empty")
	}
}

func TestEventStore_NilPayload(t *testing.T) {
	config := DefaultConfig()
	store, err := NewStore(config)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	// Emit with nil payload
	err = store.Emit("nil.payload", "src", "rig", nil)
	if err != nil {
		t.Fatalf("Failed to emit with nil payload: %v", err)
	}

	events, err := store.Query(EventFilter{})
	if err != nil {
		t.Fatalf("Failed to query: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}
}
