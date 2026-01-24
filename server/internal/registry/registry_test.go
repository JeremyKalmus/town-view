package registry

import (
	"sync"
	"testing"
	"time"
)

// TestAgentRegistry_Register_AppearsInList tests AC-1: Agents can register and appear in list.
func TestAgentRegistry_Register_AppearsInList(t *testing.T) {
	r := NewWithDefaults()

	// Register an agent
	reg := AgentRegistration{
		ID:   "townview/polecats/obsidian",
		Rig:  "townview",
		Role: RolePolecat,
		Name: "obsidian",
	}

	state := r.Register(reg)

	// Verify the returned state
	if state.ID != reg.ID {
		t.Errorf("Expected ID %s, got %s", reg.ID, state.ID)
	}
	if state.Rig != reg.Rig {
		t.Errorf("Expected Rig %s, got %s", reg.Rig, state.Rig)
	}
	if state.Role != reg.Role {
		t.Errorf("Expected Role %s, got %s", reg.Role, state.Role)
	}
	if state.Name != reg.Name {
		t.Errorf("Expected Name %s, got %s", reg.Name, state.Name)
	}
	if state.Status != StatusStarting {
		t.Errorf("Expected Status %s, got %s", StatusStarting, state.Status)
	}

	// Verify agent appears in list
	agents := r.ListAgents(nil)
	if len(agents) != 1 {
		t.Fatalf("Expected 1 agent, got %d", len(agents))
	}
	if agents[0].ID != reg.ID {
		t.Errorf("Expected agent ID %s in list, got %s", reg.ID, agents[0].ID)
	}

	// Verify GetAgent returns the agent
	agent := r.GetAgent(reg.ID)
	if agent == nil {
		t.Fatal("Expected to get agent, got nil")
	}
	if agent.ID != reg.ID {
		t.Errorf("Expected agent ID %s, got %s", reg.ID, agent.ID)
	}

	// Verify GetAgentsByRig returns the agent
	rigAgents := r.GetAgentsByRig("townview")
	if len(rigAgents) != 1 {
		t.Fatalf("Expected 1 agent for rig, got %d", len(rigAgents))
	}
	if rigAgents[0].ID != reg.ID {
		t.Errorf("Expected agent ID %s for rig, got %s", reg.ID, rigAgents[0].ID)
	}
}

// TestAgentRegistry_Heartbeat_UpdatesState tests AC-2: Heartbeats update agent state.
func TestAgentRegistry_Heartbeat_UpdatesState(t *testing.T) {
	r := NewWithDefaults()

	// Register an agent
	reg := AgentRegistration{
		ID:   "townview/polecats/obsidian",
		Rig:  "townview",
		Role: RolePolecat,
		Name: "obsidian",
	}
	r.Register(reg)

	// Send heartbeat with status change and bead
	beadID := "to-2e0s.2"
	beat := Heartbeat{
		AgentID:     reg.ID,
		Timestamp:   time.Now(),
		Status:      StatusWorking,
		CurrentBead: &beadID,
	}

	state := r.Heartbeat(beat)

	// Verify state was updated
	if state == nil {
		t.Fatal("Expected state, got nil")
	}
	if state.Status != StatusWorking {
		t.Errorf("Expected status %s, got %s", StatusWorking, state.Status)
	}
	if state.CurrentBead == nil || *state.CurrentBead != beadID {
		t.Errorf("Expected current bead %s, got %v", beadID, state.CurrentBead)
	}
	if state.CurrentBeadStarted == nil {
		t.Error("Expected CurrentBeadStarted to be set")
	}
	if state.MissedHeartbeats != 0 {
		t.Errorf("Expected 0 missed heartbeats, got %d", state.MissedHeartbeats)
	}

	// Verify state persisted
	agent := r.GetAgent(reg.ID)
	if agent.Status != StatusWorking {
		t.Errorf("Expected persisted status %s, got %s", StatusWorking, agent.Status)
	}

	// Send another heartbeat with tokens
	tokens := 1000
	beat2 := Heartbeat{
		AgentID:         reg.ID,
		Timestamp:       time.Now(),
		Status:          StatusWorking,
		CurrentBead:     &beadID,
		TokensSinceLast: &tokens,
	}

	state2 := r.Heartbeat(beat2)
	if state2.TokensUsed == nil || *state2.TokensUsed != 1000 {
		t.Errorf("Expected tokens used 1000, got %v", state2.TokensUsed)
	}
}

// TestAgentRegistry_MissedHeartbeat_IncrementsCounter tests AC-3: Missing heartbeats increment counter.
func TestAgentRegistry_MissedHeartbeat_IncrementsCounter(t *testing.T) {
	// Use short intervals for testing
	config := Config{
		HeartbeatIntervalMs: 100, // 100ms
		StuckThreshold:      15 * time.Minute,
		DeadThreshold:       3,
		DeregisterAfter:     5 * time.Minute,
	}
	r := New(config)

	// Register an agent
	reg := AgentRegistration{
		ID:                  "townview/polecats/obsidian",
		Rig:                 "townview",
		Role:                RolePolecat,
		Name:                "obsidian",
		HeartbeatIntervalMs: 100,
	}
	r.Register(reg)

	// Wait for heartbeats to be missed
	time.Sleep(350 * time.Millisecond)

	// Trigger health check
	r.checkAgentHealth()

	// Verify missed heartbeats incremented
	agent := r.GetAgent(reg.ID)
	if agent == nil {
		t.Fatal("Expected agent, got nil")
	}
	if agent.MissedHeartbeats < 2 {
		t.Errorf("Expected at least 2 missed heartbeats, got %d", agent.MissedHeartbeats)
	}

	// Send heartbeat to reset counter
	beat := Heartbeat{
		AgentID:   reg.ID,
		Timestamp: time.Now(),
		Status:    StatusRunning,
	}
	state := r.Heartbeat(beat)

	if state.MissedHeartbeats != 0 {
		t.Errorf("Expected 0 missed heartbeats after heartbeat, got %d", state.MissedHeartbeats)
	}
}

// TestAgentRegistry_DeadAgent_AutoDeregisters tests AC-4: Dead agents auto-deregister.
func TestAgentRegistry_DeadAgent_AutoDeregisters(t *testing.T) {
	// Use short intervals for testing
	config := Config{
		HeartbeatIntervalMs: 50,                     // 50ms
		StuckThreshold:      15 * time.Minute,       // Keep stuck threshold long
		DeadThreshold:       3,                      // 3 missed = dead
		DeregisterAfter:     200 * time.Millisecond, // Auto-deregister after 200ms
	}
	r := New(config)

	// Register an agent
	reg := AgentRegistration{
		ID:                  "townview/polecats/obsidian",
		Rig:                 "townview",
		Role:                RolePolecat,
		Name:                "obsidian",
		HeartbeatIntervalMs: 50,
	}
	r.Register(reg)

	// Verify agent exists
	if r.AgentCount() != 1 {
		t.Fatalf("Expected 1 agent, got %d", r.AgentCount())
	}

	// Wait for agent to be dead and auto-deregistered
	time.Sleep(300 * time.Millisecond)

	// Trigger health check
	r.checkAgentHealth()

	// Verify agent was auto-deregistered
	if r.AgentCount() != 0 {
		t.Errorf("Expected 0 agents after auto-deregister, got %d", r.AgentCount())
	}

	agent := r.GetAgent(reg.ID)
	if agent != nil {
		t.Error("Expected agent to be deregistered")
	}
}

// TestAgentRegistry_StatusChange_EmitsEvent tests AC-5: Status changes emit events.
func TestAgentRegistry_StatusChange_EmitsEvent(t *testing.T) {
	r := NewWithDefaults()

	// Track received events
	var events []AgentEvent
	var mu sync.Mutex

	unsubscribe := r.OnAgentChange(func(event AgentEvent) {
		mu.Lock()
		events = append(events, event)
		mu.Unlock()
	})
	defer unsubscribe()

	// Register an agent (should emit registered event)
	reg := AgentRegistration{
		ID:   "townview/polecats/obsidian",
		Rig:  "townview",
		Role: RolePolecat,
		Name: "obsidian",
	}
	r.Register(reg)

	// Give time for event to be delivered
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	if len(events) != 1 {
		t.Fatalf("Expected 1 event after register, got %d", len(events))
	}
	if events[0].EventType != EventRegistered {
		t.Errorf("Expected event type %s, got %s", EventRegistered, events[0].EventType)
	}
	mu.Unlock()

	// Send heartbeat with status change (should emit updated event)
	beat := Heartbeat{
		AgentID:   reg.ID,
		Timestamp: time.Now(),
		Status:    StatusWorking, // Status change from Starting
	}
	r.Heartbeat(beat)

	// Give time for event to be delivered
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	if len(events) != 2 {
		t.Fatalf("Expected 2 events after status change, got %d", len(events))
	}
	if events[1].EventType != EventUpdated {
		t.Errorf("Expected event type %s, got %s", EventUpdated, events[1].EventType)
	}
	if events[1].Agent.Status != StatusWorking {
		t.Errorf("Expected status %s in event, got %s", StatusWorking, events[1].Agent.Status)
	}
	mu.Unlock()

	// Deregister agent (should emit deregistered event)
	r.Deregister(reg.ID)

	// Give time for event to be delivered
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	if len(events) != 3 {
		t.Fatalf("Expected 3 events after deregister, got %d", len(events))
	}
	if events[2].EventType != EventDeregistered {
		t.Errorf("Expected event type %s, got %s", EventDeregistered, events[2].EventType)
	}
	mu.Unlock()
}

// TestAgentRegistry_StuckDetection tests that agents are marked stuck when working on same bead too long.
func TestAgentRegistry_StuckDetection(t *testing.T) {
	// Use short stuck threshold for testing
	config := Config{
		HeartbeatIntervalMs: 30000,
		StuckThreshold:      100 * time.Millisecond, // 100ms for testing
		DeadThreshold:       3,
		DeregisterAfter:     5 * time.Minute,
	}
	r := New(config)

	// Track events
	var events []AgentEvent
	var mu sync.Mutex

	unsubscribe := r.OnAgentChange(func(event AgentEvent) {
		mu.Lock()
		events = append(events, event)
		mu.Unlock()
	})
	defer unsubscribe()

	// Register and set working status
	reg := AgentRegistration{
		ID:     "townview/polecats/obsidian",
		Rig:    "townview",
		Role:   RolePolecat,
		Name:   "obsidian",
		Status: StatusWorking,
	}
	r.Register(reg)

	// Set current bead
	beadID := "to-2e0s.2"
	beat := Heartbeat{
		AgentID:     reg.ID,
		Timestamp:   time.Now(),
		Status:      StatusWorking,
		CurrentBead: &beadID,
	}
	r.Heartbeat(beat)

	// Wait for stuck threshold
	time.Sleep(150 * time.Millisecond)

	// Trigger health check
	r.checkAgentHealth()

	// Give time for event to be delivered
	time.Sleep(50 * time.Millisecond)

	// Verify agent is stuck
	agent := r.GetAgent(reg.ID)
	if agent.Status != StatusStuck {
		t.Errorf("Expected status %s, got %s", StatusStuck, agent.Status)
	}

	// Verify stuck event was emitted
	mu.Lock()
	foundStuckEvent := false
	for _, e := range events {
		if e.EventType == EventUpdated && e.Agent.Status == StatusStuck {
			foundStuckEvent = true
			break
		}
	}
	mu.Unlock()

	if !foundStuckEvent {
		t.Error("Expected stuck event to be emitted")
	}
}

// TestAgentRegistry_FilterByRole tests filtering agents by role.
func TestAgentRegistry_FilterByRole(t *testing.T) {
	r := NewWithDefaults()

	// Register multiple agents with different roles
	r.Register(AgentRegistration{ID: "r1/polecats/p1", Rig: "r1", Role: RolePolecat, Name: "p1"})
	r.Register(AgentRegistration{ID: "r1/witness", Rig: "r1", Role: RoleWitness, Name: "witness"})
	r.Register(AgentRegistration{ID: "r1/polecats/p2", Rig: "r1", Role: RolePolecat, Name: "p2"})

	// Filter by polecat role
	role := RolePolecat
	polecats := r.ListAgents(&AgentFilter{Role: &role})
	if len(polecats) != 2 {
		t.Errorf("Expected 2 polecats, got %d", len(polecats))
	}

	// Filter by witness role
	witnessRole := RoleWitness
	witnesses := r.ListAgents(&AgentFilter{Role: &witnessRole})
	if len(witnesses) != 1 {
		t.Errorf("Expected 1 witness, got %d", len(witnesses))
	}
}

// TestAgentRegistry_FilterByStatus tests filtering agents by status.
func TestAgentRegistry_FilterByStatus(t *testing.T) {
	r := NewWithDefaults()

	// Register multiple agents
	r.Register(AgentRegistration{ID: "a1", Rig: "r1", Role: RolePolecat, Name: "a1"})
	r.Register(AgentRegistration{ID: "a2", Rig: "r1", Role: RolePolecat, Name: "a2"})

	// Update one to working
	r.Heartbeat(Heartbeat{AgentID: "a1", Timestamp: time.Now(), Status: StatusWorking})

	// Filter by working status
	working := StatusWorking
	workingAgents := r.ListAgents(&AgentFilter{Status: &working})
	if len(workingAgents) != 1 {
		t.Errorf("Expected 1 working agent, got %d", len(workingAgents))
	}
	if workingAgents[0].ID != "a1" {
		t.Errorf("Expected a1 to be working, got %s", workingAgents[0].ID)
	}
}

// TestAgentRegistry_Unsubscribe tests that unsubscribe stops events.
func TestAgentRegistry_Unsubscribe(t *testing.T) {
	r := NewWithDefaults()

	eventCount := 0
	var mu sync.Mutex

	unsubscribe := r.OnAgentChange(func(event AgentEvent) {
		mu.Lock()
		eventCount++
		mu.Unlock()
	})

	// Register should trigger event
	r.Register(AgentRegistration{ID: "a1", Rig: "r1", Role: RolePolecat, Name: "a1"})
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	if eventCount != 1 {
		t.Errorf("Expected 1 event before unsubscribe, got %d", eventCount)
	}
	mu.Unlock()

	// Unsubscribe
	unsubscribe()

	// Register another - should not trigger event
	r.Register(AgentRegistration{ID: "a2", Rig: "r1", Role: RolePolecat, Name: "a2"})
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	if eventCount != 1 {
		t.Errorf("Expected 1 event after unsubscribe, got %d", eventCount)
	}
	mu.Unlock()
}
