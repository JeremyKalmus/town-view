// Package registry provides an Agent Registry service with heartbeat-based state management.
// It serves as the single source of truth for "who is running and what are they doing."
package registry

import (
	"sync"
	"time"
)

// AgentRole represents the role of an agent.
type AgentRole string

const (
	RoleWitness  AgentRole = "witness"
	RoleRefinery AgentRole = "refinery"
	RoleCrew     AgentRole = "crew"
	RolePolecat  AgentRole = "polecat"
	RoleDeacon   AgentRole = "deacon"
	RoleMayor    AgentRole = "mayor"
)

// AgentStatus represents the current status of an agent.
type AgentStatus string

const (
	StatusStarting AgentStatus = "starting"
	StatusRunning  AgentStatus = "running"
	StatusIdle     AgentStatus = "idle"
	StatusWorking  AgentStatus = "working"
	StatusStuck    AgentStatus = "stuck"
	StatusStopping AgentStatus = "stopping"
	StatusStopped  AgentStatus = "stopped"
)

// AgentState represents the full state of an agent.
type AgentState struct {
	ID   string    `json:"id"`   // e.g., "townview/polecats/obsidian"
	Rig  string    `json:"rig"`  // e.g., "townview"
	Role AgentRole `json:"role"` // e.g., "polecat"
	Name string    `json:"name"` // e.g., "obsidian"

	Status AgentStatus `json:"status"` // current agent status

	// Work tracking
	CurrentBead        *string    `json:"current_bead,omitempty"`         // Bead ID being worked on
	CurrentBeadStarted *time.Time `json:"current_bead_started,omitempty"` // When work started

	// Health
	LastHeartbeat       time.Time `json:"last_heartbeat"`        // Last heartbeat time
	HeartbeatIntervalMs int       `json:"heartbeat_interval_ms"` // Expected interval
	MissedHeartbeats    int       `json:"missed_heartbeats"`     // Count of missed beats

	// Session info
	SessionID *string   `json:"session_id,omitempty"` // tmux session name
	StartedAt time.Time `json:"started_at"`           // When agent started

	// Telemetry pointers
	TokensUsed *int    `json:"tokens_used,omitempty"` // Cumulative token count
	LastCommit *string `json:"last_commit,omitempty"` // Last git commit SHA
}

// AgentRegistration contains the information needed to register an agent.
type AgentRegistration struct {
	ID                  string      `json:"id"`
	Rig                 string      `json:"rig"`
	Role                AgentRole   `json:"role"`
	Name                string      `json:"name"`
	SessionID           *string     `json:"session_id,omitempty"`
	HeartbeatIntervalMs int         `json:"heartbeat_interval_ms"`
	Status              AgentStatus `json:"status,omitempty"`
	CurrentBead         *string     `json:"current_bead,omitempty"` // Bead ID being worked on
}

// Heartbeat contains the information sent in a heartbeat.
type Heartbeat struct {
	AgentID         string      `json:"agent_id"`
	Timestamp       time.Time   `json:"timestamp"`
	Status          AgentStatus `json:"status"`
	CurrentBead     *string     `json:"current_bead,omitempty"`
	TokensSinceLast *int        `json:"tokens_since_last,omitempty"`
}

// AgentFilter specifies criteria for filtering agents.
type AgentFilter struct {
	Rig    *string      `json:"rig,omitempty"`
	Role   *AgentRole   `json:"role,omitempty"`
	Status *AgentStatus `json:"status,omitempty"`
}

// EventType represents the type of agent change event.
type EventType string

const (
	EventRegistered   EventType = "registered"
	EventUpdated      EventType = "updated"
	EventDeregistered EventType = "deregistered"
)

// AgentEvent represents a change event for an agent.
type AgentEvent struct {
	Agent     AgentState `json:"agent"`
	EventType EventType  `json:"event_type"`
	Timestamp time.Time  `json:"timestamp"`
}

// UnsubscribeFunc is a function to unsubscribe from events.
type UnsubscribeFunc func()

// Config contains configuration for the registry.
type Config struct {
	HeartbeatIntervalMs int           // Default heartbeat interval (default: 30000)
	StuckThreshold      time.Duration // Duration after which agent is stuck (default: 15 minutes)
	DeadThreshold       int           // Missed heartbeats before dead (default: 3)
	DeregisterAfter     time.Duration // Time after which dead agents auto-deregister (default: 5 minutes)
}

// DefaultConfig returns the default configuration.
func DefaultConfig() Config {
	return Config{
		HeartbeatIntervalMs: 30000,
		StuckThreshold:      15 * time.Minute,
		DeadThreshold:       3,
		DeregisterAfter:     5 * time.Minute,
	}
}

// Registry manages agent registration and state.
type Registry struct {
	config      Config
	agents      map[string]*AgentState
	subscribers []chan AgentEvent
	mu          sync.RWMutex
	subMu       sync.RWMutex

	// For monitoring missed heartbeats
	stopMonitor chan struct{}
	monitorWg   sync.WaitGroup
}

// New creates a new Registry with the given configuration.
func New(config Config) *Registry {
	r := &Registry{
		config:      config,
		agents:      make(map[string]*AgentState),
		subscribers: make([]chan AgentEvent, 0),
		stopMonitor: make(chan struct{}),
	}
	return r
}

// NewWithDefaults creates a new Registry with default configuration.
func NewWithDefaults() *Registry {
	return New(DefaultConfig())
}

// Start begins the background monitoring goroutine for missed heartbeats.
func (r *Registry) Start() {
	r.monitorWg.Add(1)
	go r.monitorLoop()
}

// Stop stops the background monitoring goroutine.
func (r *Registry) Stop() {
	close(r.stopMonitor)
	r.monitorWg.Wait()
}

// Register registers a new agent and returns its state.
func (r *Registry) Register(reg AgentRegistration) AgentState {
	now := time.Now()

	status := reg.Status
	if status == "" {
		status = StatusStarting
	}

	intervalMs := reg.HeartbeatIntervalMs
	if intervalMs == 0 {
		intervalMs = r.config.HeartbeatIntervalMs
	}

	state := AgentState{
		ID:                  reg.ID,
		Rig:                 reg.Rig,
		Role:                reg.Role,
		Name:                reg.Name,
		Status:              status,
		CurrentBead:         reg.CurrentBead,
		LastHeartbeat:       now,
		HeartbeatIntervalMs: intervalMs,
		MissedHeartbeats:    0,
		SessionID:           reg.SessionID,
		StartedAt:           now,
	}

	r.mu.Lock()
	r.agents[reg.ID] = &state
	r.mu.Unlock()

	r.emit(AgentEvent{
		Agent:     state,
		EventType: EventRegistered,
		Timestamp: now,
	})

	return state
}

// Deregister removes an agent from the registry.
func (r *Registry) Deregister(agentID string) {
	r.mu.Lock()
	agent, exists := r.agents[agentID]
	if !exists {
		r.mu.Unlock()
		return
	}
	agentCopy := *agent
	delete(r.agents, agentID)
	r.mu.Unlock()

	r.emit(AgentEvent{
		Agent:     agentCopy,
		EventType: EventDeregistered,
		Timestamp: time.Now(),
	})
}

// Heartbeat processes a heartbeat from an agent and returns the updated state.
func (r *Registry) Heartbeat(beat Heartbeat) *AgentState {
	r.mu.Lock()
	defer r.mu.Unlock()

	agent, exists := r.agents[beat.AgentID]
	if !exists {
		return nil
	}

	oldStatus := agent.Status
	oldBead := agent.CurrentBead

	// Update heartbeat time and reset missed count
	agent.LastHeartbeat = beat.Timestamp
	agent.MissedHeartbeats = 0
	agent.Status = beat.Status

	// Track bead changes
	if beat.CurrentBead != nil {
		if oldBead == nil || *oldBead != *beat.CurrentBead {
			// New bead started
			now := beat.Timestamp
			agent.CurrentBead = beat.CurrentBead
			agent.CurrentBeadStarted = &now
		}
	} else {
		agent.CurrentBead = nil
		agent.CurrentBeadStarted = nil
	}

	// Update token count
	if beat.TokensSinceLast != nil && agent.TokensUsed != nil {
		newTotal := *agent.TokensUsed + *beat.TokensSinceLast
		agent.TokensUsed = &newTotal
	} else if beat.TokensSinceLast != nil {
		agent.TokensUsed = beat.TokensSinceLast
	}

	// Emit event if status changed
	if oldStatus != agent.Status {
		r.emitWithLock(AgentEvent{
			Agent:     *agent,
			EventType: EventUpdated,
			Timestamp: beat.Timestamp,
		})
	}

	return agent
}

// GetAgent returns an agent by ID, or nil if not found.
func (r *Registry) GetAgent(agentID string) *AgentState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	agent, exists := r.agents[agentID]
	if !exists {
		return nil
	}
	// Return a copy to prevent external modification
	copy := *agent
	return &copy
}

// ListAgents returns all agents matching the optional filter.
func (r *Registry) ListAgents(filter *AgentFilter) []AgentState {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]AgentState, 0, len(r.agents))
	for _, agent := range r.agents {
		if filter != nil {
			if filter.Rig != nil && agent.Rig != *filter.Rig {
				continue
			}
			if filter.Role != nil && agent.Role != *filter.Role {
				continue
			}
			if filter.Status != nil && agent.Status != *filter.Status {
				continue
			}
		}
		result = append(result, *agent)
	}
	return result
}

// GetAgentsByRig returns all agents for a specific rig.
func (r *Registry) GetAgentsByRig(rigID string) []AgentState {
	return r.ListAgents(&AgentFilter{Rig: &rigID})
}

// OnAgentChange subscribes to agent change events.
// Returns an unsubscribe function.
func (r *Registry) OnAgentChange(callback func(AgentEvent)) UnsubscribeFunc {
	ch := make(chan AgentEvent, 64)

	r.subMu.Lock()
	r.subscribers = append(r.subscribers, ch)
	r.subMu.Unlock()

	// Start goroutine to forward events to callback
	go func() {
		for event := range ch {
			callback(event)
		}
	}()

	// Return unsubscribe function
	return func() {
		r.subMu.Lock()
		defer r.subMu.Unlock()

		for i, sub := range r.subscribers {
			if sub == ch {
				r.subscribers = append(r.subscribers[:i], r.subscribers[i+1:]...)
				close(ch)
				return
			}
		}
	}
}

// emit sends an event to all subscribers.
func (r *Registry) emit(event AgentEvent) {
	r.subMu.RLock()
	defer r.subMu.RUnlock()

	for _, ch := range r.subscribers {
		select {
		case ch <- event:
		default:
			// Channel full, skip
		}
	}
}

// emitWithLock sends an event without acquiring the main lock (caller must hold it).
func (r *Registry) emitWithLock(event AgentEvent) {
	r.subMu.RLock()
	defer r.subMu.RUnlock()

	for _, ch := range r.subscribers {
		select {
		case ch <- event:
		default:
			// Channel full, skip
		}
	}
}

// monitorLoop runs in the background to check for missed heartbeats and stuck agents.
func (r *Registry) monitorLoop() {
	defer r.monitorWg.Done()

	// Check every 10 seconds
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.stopMonitor:
			return
		case <-ticker.C:
			r.checkAgentHealth()
		}
	}
}

// checkAgentHealth checks all agents for missed heartbeats and stuck status.
func (r *Registry) checkAgentHealth() {
	now := time.Now()
	var toDeregister []string
	var events []AgentEvent

	r.mu.Lock()
	for id, agent := range r.agents {
		// Calculate expected heartbeat interval
		interval := time.Duration(agent.HeartbeatIntervalMs) * time.Millisecond
		timeSinceHeartbeat := now.Sub(agent.LastHeartbeat)

		// Check for missed heartbeats
		if timeSinceHeartbeat > interval {
			missedCount := int(timeSinceHeartbeat / interval)
			if missedCount > agent.MissedHeartbeats {
				agent.MissedHeartbeats = missedCount

				// Check if dead
				if agent.MissedHeartbeats > r.config.DeadThreshold {
					// Check if should auto-deregister
					if timeSinceHeartbeat > r.config.DeregisterAfter {
						toDeregister = append(toDeregister, id)
						continue
					}
				}
			}
		}

		// Check for stuck status (working + same bead > threshold)
		if agent.Status == StatusWorking && agent.CurrentBeadStarted != nil {
			beadDuration := now.Sub(*agent.CurrentBeadStarted)
			if beadDuration > r.config.StuckThreshold && agent.Status != StatusStuck {
				oldStatus := agent.Status
				agent.Status = StatusStuck
				if oldStatus != agent.Status {
					events = append(events, AgentEvent{
						Agent:     *agent,
						EventType: EventUpdated,
						Timestamp: now,
					})
				}
			}
		}
	}
	r.mu.Unlock()

	// Emit events outside of lock
	for _, event := range events {
		r.emit(event)
	}

	// Deregister dead agents
	for _, id := range toDeregister {
		r.Deregister(id)
	}
}

// AgentCount returns the number of registered agents.
func (r *Registry) AgentCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.agents)
}
