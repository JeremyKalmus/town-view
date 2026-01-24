// Package events provides event storage and broadcasting for Town View.
package events

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Event represents a stored event.
type Event struct {
	ID        int64           `json:"id"`
	Type      string          `json:"type"`
	Source    string          `json:"source"`
	Rig       string          `json:"rig"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

// EventFilter defines query parameters for filtering events.
type EventFilter struct {
	Type      string     // Filter by event type (empty for all)
	Source    string     // Filter by source (empty for all)
	Rig       string     // Filter by rig (empty for all)
	StartTime *time.Time // Filter events after this time
	EndTime   *time.Time // Filter events before this time
	Limit     int        // Maximum events to return (0 for no limit)
}

// subscriber represents a subscription to event notifications.
type subscriber struct {
	ch     chan Event
	filter EventFilter
}

// StoreConfig holds configuration for the event store.
type StoreConfig struct {
	DBPath         string        // Path to SQLite database file
	RetentionDays  int           // Number of days to retain events (default 30)
	CleanupPeriod  time.Duration // How often to run cleanup (default 1 hour)
}

// DefaultConfig returns a default store configuration.
func DefaultConfig() StoreConfig {
	return StoreConfig{
		DBPath:         ":memory:",
		RetentionDays:  30,
		CleanupPeriod:  time.Hour,
	}
}

// Store provides persistent event storage with real-time subscriptions.
type Store struct {
	db          *sql.DB
	config      StoreConfig
	subscribers map[*subscriber]bool
	mu          sync.RWMutex
	stopCleanup chan struct{}
}

// NewStore creates a new event store with the given configuration.
func NewStore(config StoreConfig) (*Store, error) {
	db, err := sql.Open("sqlite3", config.DBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Create events table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			type TEXT NOT NULL,
			source TEXT NOT NULL,
			rig TEXT NOT NULL,
			payload TEXT,
			timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create events table: %w", err)
	}

	// Create indexes for efficient querying
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)",
		"CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)",
		"CREATE INDEX IF NOT EXISTS idx_events_source ON events(source)",
		"CREATE INDEX IF NOT EXISTS idx_events_rig ON events(rig)",
	}
	for _, idx := range indexes {
		if _, err := db.Exec(idx); err != nil {
			db.Close()
			return nil, fmt.Errorf("failed to create index: %w", err)
		}
	}

	s := &Store{
		db:          db,
		config:      config,
		subscribers: make(map[*subscriber]bool),
		stopCleanup: make(chan struct{}),
	}

	// Start cleanup goroutine
	go s.cleanupLoop()

	return s, nil
}

// Close shuts down the event store.
func (s *Store) Close() error {
	close(s.stopCleanup)

	s.mu.Lock()
	for sub := range s.subscribers {
		close(sub.ch)
		delete(s.subscribers, sub)
	}
	s.mu.Unlock()

	return s.db.Close()
}

// Emit stores an event and notifies subscribers.
func (s *Store) Emit(eventType, source, rig string, payload interface{}) error {
	// Marshal payload
	var payloadJSON []byte
	if payload != nil {
		var err error
		payloadJSON, err = json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal payload: %w", err)
		}
	}

	timestamp := time.Now().UTC()

	// Insert into database
	result, err := s.db.Exec(
		"INSERT INTO events (type, source, rig, payload, timestamp) VALUES (?, ?, ?, ?, ?)",
		eventType, source, rig, string(payloadJSON), timestamp,
	)
	if err != nil {
		return fmt.Errorf("failed to insert event: %w", err)
	}

	id, _ := result.LastInsertId()

	event := Event{
		ID:        id,
		Type:      eventType,
		Source:    source,
		Rig:       rig,
		Payload:   payloadJSON,
		Timestamp: timestamp,
	}

	// Notify subscribers
	s.notifySubscribers(event)

	return nil
}

// Query retrieves events matching the filter criteria.
func (s *Store) Query(filter EventFilter) ([]Event, error) {
	query := "SELECT id, type, source, rig, payload, timestamp FROM events WHERE 1=1"
	args := []interface{}{}

	if filter.Type != "" {
		query += " AND type = ?"
		args = append(args, filter.Type)
	}
	if filter.Source != "" {
		query += " AND source = ?"
		args = append(args, filter.Source)
	}
	if filter.Rig != "" {
		query += " AND rig = ?"
		args = append(args, filter.Rig)
	}
	if filter.StartTime != nil {
		query += " AND timestamp >= ?"
		args = append(args, filter.StartTime.UTC())
	}
	if filter.EndTime != nil {
		query += " AND timestamp <= ?"
		args = append(args, filter.EndTime.UTC())
	}

	query += " ORDER BY timestamp ASC"

	if filter.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, filter.Limit)
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var payloadStr sql.NullString
		var timestampStr string

		if err := rows.Scan(&e.ID, &e.Type, &e.Source, &e.Rig, &payloadStr, &timestampStr); err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		if payloadStr.Valid {
			e.Payload = json.RawMessage(payloadStr.String)
		}

		// Parse timestamp
		e.Timestamp, _ = time.Parse("2006-01-02 15:04:05.999999999-07:00", timestampStr)
		if e.Timestamp.IsZero() {
			e.Timestamp, _ = time.Parse("2006-01-02 15:04:05", timestampStr)
		}
		if e.Timestamp.IsZero() {
			e.Timestamp, _ = time.Parse(time.RFC3339, timestampStr)
		}

		events = append(events, e)
	}

	return events, rows.Err()
}

// Subscribe creates a subscription for events matching the filter.
// Returns a channel that receives events. Call Unsubscribe to stop.
func (s *Store) Subscribe(filter EventFilter) <-chan Event {
	ch := make(chan Event, 256)
	sub := &subscriber{ch: ch, filter: filter}

	s.mu.Lock()
	s.subscribers[sub] = true
	s.mu.Unlock()

	return ch
}

// Unsubscribe removes a subscription.
func (s *Store) Unsubscribe(ch <-chan Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for sub := range s.subscribers {
		if sub.ch == ch {
			close(sub.ch)
			delete(s.subscribers, sub)
			return
		}
	}
}

// Replay sends historical events to a channel from the given timestamp.
func (s *Store) Replay(from time.Time, filter EventFilter) ([]Event, error) {
	filter.StartTime = &from
	return s.Query(filter)
}

// notifySubscribers sends an event to all matching subscribers.
func (s *Store) notifySubscribers(event Event) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for sub := range s.subscribers {
		if s.matchesFilter(event, sub.filter) {
			select {
			case sub.ch <- event:
			default:
				slog.Warn("Subscriber buffer full, dropping event", "type", event.Type)
			}
		}
	}
}

// matchesFilter checks if an event matches the subscription filter.
func (s *Store) matchesFilter(event Event, filter EventFilter) bool {
	if filter.Type != "" && event.Type != filter.Type {
		return false
	}
	if filter.Source != "" && event.Source != filter.Source {
		return false
	}
	if filter.Rig != "" && event.Rig != filter.Rig {
		return false
	}
	return true
}

// cleanupLoop periodically removes old events.
func (s *Store) cleanupLoop() {
	ticker := time.NewTicker(s.config.CleanupPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCleanup:
			return
		case <-ticker.C:
			s.cleanup()
		}
	}
}

// cleanup removes events older than the retention period.
func (s *Store) cleanup() {
	cutoff := time.Now().UTC().AddDate(0, 0, -s.config.RetentionDays)
	result, err := s.db.Exec("DELETE FROM events WHERE timestamp < ?", cutoff)
	if err != nil {
		slog.Error("Failed to cleanup old events", "error", err)
		return
	}

	count, _ := result.RowsAffected()
	if count > 0 {
		slog.Info("Cleaned up old events", "count", count, "cutoff", cutoff)
	}
}
