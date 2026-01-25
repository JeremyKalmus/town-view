package query

import (
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/gastown/townview/internal/events"
	"github.com/gastown/townview/internal/registry"
	_ "github.com/mattn/go-sqlite3"
)

// testDB creates a temporary SQLite database with test data.
func setupTestDB(t *testing.T) (string, func()) {
	t.Helper()

	// Create temp file
	tmpFile, err := os.CreateTemp("", "query_test_*.db")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	tmpFile.Close()

	// Open database
	db, err := sql.Open("sqlite3", tmpFile.Name())
	if err != nil {
		os.Remove(tmpFile.Name())
		t.Fatalf("failed to open database: %v", err)
	}

	// Create schema
	schema := `
		CREATE TABLE issues (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'open',
			priority INTEGER NOT NULL DEFAULT 2,
			issue_type TEXT NOT NULL DEFAULT 'task',
			owner TEXT,
			assignee TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			created_by TEXT DEFAULT '',
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			closed_at DATETIME,
			close_reason TEXT DEFAULT '',
			deleted_at DATETIME,
			source_repo TEXT DEFAULT '.'
		);

		CREATE TABLE dependencies (
			issue_id TEXT NOT NULL,
			depends_on_id TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'blocks',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			created_by TEXT NOT NULL,
			PRIMARY KEY (issue_id, depends_on_id, type)
		);

		CREATE INDEX idx_issues_status ON issues(status);
		CREATE INDEX idx_dependencies_issue_id ON dependencies(issue_id);
		CREATE INDEX idx_dependencies_depends_on ON dependencies(depends_on_id);
	`

	if _, err := db.Exec(schema); err != nil {
		db.Close()
		os.Remove(tmpFile.Name())
		t.Fatalf("failed to create schema: %v", err)
	}

	db.Close()

	cleanup := func() {
		os.Remove(tmpFile.Name())
	}

	return tmpFile.Name(), cleanup
}

// insertTestIssue inserts a test issue into the database.
func insertTestIssue(t *testing.T, dbPath string, id, title, status, issueType string, priority int) {
	t.Helper()

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	_, err = db.Exec(`
		INSERT INTO issues (id, title, status, issue_type, priority)
		VALUES (?, ?, ?, ?, ?)
	`, id, title, status, issueType, priority)
	if err != nil {
		t.Fatalf("failed to insert issue: %v", err)
	}
}

// insertTestDependency inserts a test dependency into the database.
func insertTestDependency(t *testing.T, dbPath string, issueID, dependsOnID, depType string) {
	t.Helper()

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	_, err = db.Exec(`
		INSERT INTO dependencies (issue_id, depends_on_id, type, created_by)
		VALUES (?, ?, ?, 'test')
	`, issueID, dependsOnID, depType)
	if err != nil {
		t.Fatalf("failed to insert dependency: %v", err)
	}
}

// TestQueryService_ListIssues_DirectSQLite verifies AC-1: Issues queried directly from SQLite.
func TestQueryService_ListIssues_DirectSQLite(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Insert test issues
	insertTestIssue(t, dbPath, "test-001", "First Issue", "open", "task", 1)
	insertTestIssue(t, dbPath, "test-002", "Second Issue", "in_progress", "bug", 2)
	insertTestIssue(t, dbPath, "test-003", "Third Issue", "closed", "task", 3)

	// Create service without registry or event store
	config := DefaultConfig()
	config.DBPath = dbPath
	svc, err := New(config, nil, nil)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// Test: List all issues
	issues, err := svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("ListIssues failed: %v", err)
	}

	// Should return 2 non-closed issues (closed is filtered out by default status != tombstone check)
	// Actually our query doesn't filter closed, let's verify
	if len(issues) != 3 {
		t.Errorf("expected 3 issues, got %d", len(issues))
	}

	// Test: Filter by status
	openIssues, err := svc.ListIssues(IssueFilter{Status: []string{"open"}})
	if err != nil {
		t.Fatalf("ListIssues with status filter failed: %v", err)
	}
	if len(openIssues) != 1 {
		t.Errorf("expected 1 open issue, got %d", len(openIssues))
	}
	if len(openIssues) > 0 && openIssues[0].ID != "test-001" {
		t.Errorf("expected issue test-001, got %s", openIssues[0].ID)
	}

	// Test: Filter by type
	bugIssues, err := svc.ListIssues(IssueFilter{Type: []string{"bug"}})
	if err != nil {
		t.Fatalf("ListIssues with type filter failed: %v", err)
	}
	if len(bugIssues) != 1 {
		t.Errorf("expected 1 bug issue, got %d", len(bugIssues))
	}

	// Test: Get single issue by ID
	issue, err := svc.GetIssue("test-002")
	if err != nil {
		t.Fatalf("GetIssue failed: %v", err)
	}
	if issue == nil {
		t.Fatal("expected issue, got nil")
	}
	if issue.Title != "Second Issue" {
		t.Errorf("expected title 'Second Issue', got '%s'", issue.Title)
	}

	// Test: Get non-existent issue
	notFound, err := svc.GetIssue("nonexistent")
	if err != nil {
		t.Fatalf("GetIssue for nonexistent failed: %v", err)
	}
	if notFound != nil {
		t.Error("expected nil for nonexistent issue")
	}
}

// TestQueryService_ListIssues_CacheHit verifies AC-2: Cache returns data without DB hit.
func TestQueryService_ListIssues_CacheHit(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Insert test issue
	insertTestIssue(t, dbPath, "cache-001", "Cached Issue", "open", "task", 1)

	config := DefaultConfig()
	config.DBPath = dbPath
	config.CacheConfig.IssuesTTL = 1 * time.Minute // Long TTL for testing
	svc, err := New(config, nil, nil)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// First call - should query DB
	issues1, err := svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("first ListIssues failed: %v", err)
	}
	if len(issues1) != 1 {
		t.Errorf("expected 1 issue, got %d", len(issues1))
	}

	// Insert another issue directly (bypass service)
	insertTestIssue(t, dbPath, "cache-002", "New Issue", "open", "task", 1)

	// Second call - should return cached data (not see new issue)
	issues2, err := svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("second ListIssues failed: %v", err)
	}

	// Cache hit: should still return 1 issue (cached result)
	if len(issues2) != 1 {
		t.Errorf("expected 1 issue from cache, got %d (cache miss)", len(issues2))
	}

	// Test single issue cache
	issue1, err := svc.GetIssue("cache-001")
	if err != nil {
		t.Fatalf("first GetIssue failed: %v", err)
	}
	if issue1 == nil {
		t.Fatal("expected issue, got nil")
	}

	// Modify issue directly in DB
	db, _ := sql.Open("sqlite3", dbPath)
	db.Exec("UPDATE issues SET title = 'Modified Title' WHERE id = 'cache-001'")
	db.Close()

	// Second GetIssue - should return cached (old) title
	issue2, err := svc.GetIssue("cache-001")
	if err != nil {
		t.Fatalf("second GetIssue failed: %v", err)
	}
	if issue2.Title != "Cached Issue" {
		t.Errorf("expected cached title 'Cached Issue', got '%s' (cache miss)", issue2.Title)
	}

	// Invalidate cache and verify fresh data is fetched
	svc.InvalidateCache()

	issues3, err := svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("ListIssues after invalidation failed: %v", err)
	}

	// After invalidation: should see both issues
	if len(issues3) != 2 {
		t.Errorf("expected 2 issues after cache invalidation, got %d", len(issues3))
	}
}

// TestQueryService_CacheInvalidation_OnEvent verifies AC-3: Cache invalidates on relevant events.
func TestQueryService_CacheInvalidation_OnEvent(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Insert test issue
	insertTestIssue(t, dbPath, "event-001", "Event Issue", "open", "task", 1)

	// Create event store
	eventStore, err := events.NewStore(events.DefaultConfig())
	if err != nil {
		t.Fatalf("failed to create event store: %v", err)
	}
	defer eventStore.Close()

	config := DefaultConfig()
	config.DBPath = dbPath
	config.CacheConfig.IssuesTTL = 1 * time.Hour // Long TTL
	svc, err := New(config, nil, eventStore)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// First call - populate cache
	issues1, err := svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("first ListIssues failed: %v", err)
	}
	if len(issues1) != 1 {
		t.Errorf("expected 1 issue, got %d", len(issues1))
	}

	// Insert new issue directly
	insertTestIssue(t, dbPath, "event-002", "New Event Issue", "open", "task", 1)

	// Verify still cached (should return 1)
	issues2, err := svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("second ListIssues failed: %v", err)
	}
	if len(issues2) != 1 {
		t.Errorf("expected 1 issue from cache, got %d", len(issues2))
	}

	// Emit bead event to trigger cache invalidation
	err = eventStore.Emit("bead.created", "test", "townview", map[string]string{"issue_id": "event-002"})
	if err != nil {
		t.Fatalf("failed to emit event: %v", err)
	}

	// Give event loop time to process
	time.Sleep(100 * time.Millisecond)

	// After event: cache should be invalidated, should see both issues
	issues3, err := svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("third ListIssues failed: %v", err)
	}
	if len(issues3) != 2 {
		t.Errorf("expected 2 issues after cache invalidation via event, got %d", len(issues3))
	}

	// Test convoy event invalidation
	insertTestIssue(t, dbPath, "convoy-001", "Test Convoy", "open", "convoy", 1)
	insertTestIssue(t, dbPath, "convoy-child-001", "Convoy Child", "closed", "task", 1)
	insertTestDependency(t, dbPath, "convoy-child-001", "convoy-001", "tracks")

	// Get convoy progress (caches it)
	progress1, err := svc.GetConvoyProgress("convoy-001")
	if err != nil {
		t.Fatalf("first GetConvoyProgress failed: %v", err)
	}
	if progress1.Total != 1 || progress1.Completed != 1 {
		t.Errorf("expected 1/1 progress, got %d/%d", progress1.Completed, progress1.Total)
	}

	// Add another tracked issue
	insertTestIssue(t, dbPath, "convoy-child-002", "Convoy Child 2", "open", "task", 1)
	insertTestDependency(t, dbPath, "convoy-child-002", "convoy-001", "tracks")

	// Should still be cached
	progress2, err := svc.GetConvoyProgress("convoy-001")
	if err != nil {
		t.Fatalf("second GetConvoyProgress failed: %v", err)
	}
	if progress2.Total != 1 {
		t.Errorf("expected cached progress 1 total, got %d", progress2.Total)
	}

	// Emit convoy event
	err = eventStore.Emit("convoy.updated", "test", "townview", nil)
	if err != nil {
		t.Fatalf("failed to emit convoy event: %v", err)
	}
	time.Sleep(100 * time.Millisecond)

	// After event: should see updated progress
	progress3, err := svc.GetConvoyProgress("convoy-001")
	if err != nil {
		t.Fatalf("third GetConvoyProgress failed: %v", err)
	}
	if progress3.Total != 2 {
		t.Errorf("expected 2 total after convoy event, got %d", progress3.Total)
	}
}

// TestQueryService_ConvoyProgress_Computed verifies AC-4: Convoy progress computed correctly.
func TestQueryService_ConvoyProgress_Computed(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Create convoy
	insertTestIssue(t, dbPath, "progress-convoy", "Test Convoy", "open", "convoy", 1)

	// Create tracked issues with various statuses
	insertTestIssue(t, dbPath, "progress-001", "Task 1", "closed", "task", 1)
	insertTestIssue(t, dbPath, "progress-002", "Task 2", "open", "task", 1)
	insertTestIssue(t, dbPath, "progress-003", "Task 3", "in_progress", "task", 1)
	insertTestIssue(t, dbPath, "progress-004", "Task 4", "closed", "task", 1)
	insertTestIssue(t, dbPath, "progress-005", "Task 5", "tombstone", "task", 1) // Also counts as completed

	// Create tracking dependencies
	insertTestDependency(t, dbPath, "progress-001", "progress-convoy", "tracks")
	insertTestDependency(t, dbPath, "progress-002", "progress-convoy", "tracks")
	insertTestDependency(t, dbPath, "progress-003", "progress-convoy", "tracks")
	insertTestDependency(t, dbPath, "progress-004", "progress-convoy", "tracks")
	insertTestDependency(t, dbPath, "progress-005", "progress-convoy", "tracks")

	config := DefaultConfig()
	config.DBPath = dbPath
	svc, err := New(config, nil, nil)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// Get convoy progress
	progress, err := svc.GetConvoyProgress("progress-convoy")
	if err != nil {
		t.Fatalf("GetConvoyProgress failed: %v", err)
	}

	// Expected: 5 total, 3 completed (2 closed + 1 tombstone)
	if progress.Total != 5 {
		t.Errorf("expected 5 total issues, got %d", progress.Total)
	}
	if progress.Completed != 3 {
		t.Errorf("expected 3 completed issues, got %d", progress.Completed)
	}

	expectedPercentage := 60.0 // 3/5 * 100
	if progress.Percentage != expectedPercentage {
		t.Errorf("expected %.1f%% progress, got %.1f%%", expectedPercentage, progress.Percentage)
	}

	// Test empty convoy
	insertTestIssue(t, dbPath, "empty-convoy", "Empty Convoy", "open", "convoy", 1)
	emptyProgress, err := svc.GetConvoyProgress("empty-convoy")
	if err != nil {
		t.Fatalf("GetConvoyProgress for empty convoy failed: %v", err)
	}
	if emptyProgress.Total != 0 || emptyProgress.Completed != 0 || emptyProgress.Percentage != 0 {
		t.Errorf("expected 0/0/0 for empty convoy, got %d/%d/%.1f",
			emptyProgress.Total, emptyProgress.Completed, emptyProgress.Percentage)
	}
}

// TestQueryService_DependencyGraph_Traversal verifies AC-5: Dependency graph traverses correctly.
func TestQueryService_DependencyGraph_Traversal(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Create a dependency tree:
	//   epic-001 (root)
	//   ├── task-001
	//   │   ├── subtask-001
	//   │   └── subtask-002
	//   └── task-002
	//       └── subtask-003

	insertTestIssue(t, dbPath, "epic-001", "Epic", "open", "epic", 1)
	insertTestIssue(t, dbPath, "task-001", "Task 1", "open", "task", 2)
	insertTestIssue(t, dbPath, "task-002", "Task 2", "open", "task", 2)
	insertTestIssue(t, dbPath, "subtask-001", "Subtask 1", "closed", "task", 3)
	insertTestIssue(t, dbPath, "subtask-002", "Subtask 2", "open", "task", 3)
	insertTestIssue(t, dbPath, "subtask-003", "Subtask 3", "open", "task", 3)

	// Dependencies: issue_id blocks depends_on_id
	// Here: child blocks parent (child depends on parent being done to unblock)
	// But for blocked-by (what depends on this), we need reverse
	// task-001 depends on epic-001 being open
	insertTestDependency(t, dbPath, "task-001", "epic-001", "blocks")
	insertTestDependency(t, dbPath, "task-002", "epic-001", "blocks")
	insertTestDependency(t, dbPath, "subtask-001", "task-001", "blocks")
	insertTestDependency(t, dbPath, "subtask-002", "task-001", "blocks")
	insertTestDependency(t, dbPath, "subtask-003", "task-002", "blocks")

	config := DefaultConfig()
	config.DBPath = dbPath
	svc, err := New(config, nil, nil)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// Get dependency graph from root
	graph, err := svc.GetDependencyGraph("epic-001")
	if err != nil {
		t.Fatalf("GetDependencyGraph failed: %v", err)
	}

	// Verify root
	if graph.Root.Issue.ID != "epic-001" {
		t.Errorf("expected root ID 'epic-001', got '%s'", graph.Root.Issue.ID)
	}
	if graph.Root.Depth != 0 {
		t.Errorf("expected root depth 0, got %d", graph.Root.Depth)
	}

	// Root should have 2 children (task-001 and task-002)
	if len(graph.Root.Children) != 2 {
		t.Errorf("expected 2 children at root level, got %d", len(graph.Root.Children))
	}

	// Total should be 6 (epic + 2 tasks + 3 subtasks)
	if graph.Total != 6 {
		t.Errorf("expected 6 total nodes, got %d", graph.Total)
	}

	// Verify child depths
	for _, child := range graph.Root.Children {
		if child.Depth != 1 {
			t.Errorf("expected child depth 1, got %d for %s", child.Depth, child.Issue.ID)
		}

		// Each task should have subtasks
		for _, grandchild := range child.Children {
			if grandchild.Depth != 2 {
				t.Errorf("expected grandchild depth 2, got %d for %s", grandchild.Depth, grandchild.Issue.ID)
			}
		}
	}

	// Test direct dependencies (blockers and blocked-by)
	deps, err := svc.GetDependencies("task-001")
	if err != nil {
		t.Fatalf("GetDependencies failed: %v", err)
	}

	// task-001 blocks epic-001 (depends on it)
	if len(deps.Blockers) != 1 || deps.Blockers[0].ID != "epic-001" {
		t.Errorf("expected 1 blocker (epic-001), got %v", deps.Blockers)
	}

	// task-001 is blocked by subtask-001 and subtask-002
	if len(deps.BlockedBy) != 2 {
		t.Errorf("expected 2 blocked-by issues, got %d", len(deps.BlockedBy))
	}
}

// TestQueryService_AgentIntegration tests agent registry integration.
func TestQueryService_AgentIntegration(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Create agent registry
	reg := registry.NewWithDefaults()

	// Register some agents
	reg.Register(registry.AgentRegistration{
		ID:   "townview/polecats/test",
		Rig:  "townview",
		Role: registry.RolePolecat,
		Name: "test",
	})
	reg.Register(registry.AgentRegistration{
		ID:   "townview/witness",
		Rig:  "townview",
		Role: registry.RoleWitness,
		Name: "witness",
	})

	config := DefaultConfig()
	config.DBPath = dbPath
	svc, err := New(config, reg, nil)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// List all agents
	agents, err := svc.ListAgents("")
	if err != nil {
		t.Fatalf("ListAgents failed: %v", err)
	}
	if len(agents) != 2 {
		t.Errorf("expected 2 agents, got %d", len(agents))
	}

	// List agents by rig
	rigAgents, err := svc.ListAgents("townview")
	if err != nil {
		t.Fatalf("ListAgents by rig failed: %v", err)
	}
	if len(rigAgents) != 2 {
		t.Errorf("expected 2 townview agents, got %d", len(rigAgents))
	}

	// Get specific agent
	agent, err := svc.GetAgent("townview/polecats/test")
	if err != nil {
		t.Fatalf("GetAgent failed: %v", err)
	}
	if agent == nil {
		t.Fatal("expected agent, got nil")
	}
	if agent.Name != "test" {
		t.Errorf("expected agent name 'test', got '%s'", agent.Name)
	}
}

// TestQueryService_Limit tests limit and offset parameters.
func TestQueryService_Limit(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Insert multiple issues
	for i := 0; i < 10; i++ {
		insertTestIssue(t, dbPath,
			"limit-"+string(rune('A'+i)),
			"Issue "+string(rune('A'+i)),
			"open", "task", i%3+1)
	}

	config := DefaultConfig()
	config.DBPath = dbPath
	svc, err := New(config, nil, nil)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// Test limit
	limited, err := svc.ListIssues(IssueFilter{Limit: 5})
	if err != nil {
		t.Fatalf("ListIssues with limit failed: %v", err)
	}
	if len(limited) != 5 {
		t.Errorf("expected 5 issues with limit, got %d", len(limited))
	}

	// Test offset
	offset, err := svc.ListIssues(IssueFilter{Limit: 3, Offset: 5})
	if err != nil {
		t.Fatalf("ListIssues with offset failed: %v", err)
	}
	if len(offset) != 3 {
		t.Errorf("expected 3 issues with offset, got %d", len(offset))
	}
}

// TestQueryService_CacheStats tests cache statistics tracking.
func TestQueryService_CacheStats(t *testing.T) {
	dbPath, cleanup := setupTestDB(t)
	defer cleanup()

	// Insert test issues
	insertTestIssue(t, dbPath, "stats-001", "Issue 1", "open", "task", 1)
	insertTestIssue(t, dbPath, "stats-002", "Issue 2", "open", "task", 1)
	insertTestIssue(t, dbPath, "convoy-001", "Test Convoy", "open", "convoy", 1)
	insertTestDependency(t, dbPath, "stats-001", "convoy-001", "tracks")

	config := DefaultConfig()
	config.DBPath = dbPath
	config.CacheConfig.IssuesTTL = 1 * time.Minute
	svc, err := New(config, nil, nil)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	defer svc.Close()

	// Initial stats - should be zero
	stats := svc.GetCacheStats()
	if stats.HitCount != 0 || stats.MissCount != 0 {
		t.Errorf("expected 0 hits/misses initially, got %d/%d", stats.HitCount, stats.MissCount)
	}
	if stats.IssueEntries != 0 {
		t.Errorf("expected 0 cache entries initially, got %d", stats.IssueEntries)
	}

	// First GetIssue - should be a miss
	_, err = svc.GetIssue("stats-001")
	if err != nil {
		t.Fatalf("GetIssue failed: %v", err)
	}

	stats = svc.GetCacheStats()
	if stats.MissCount != 1 {
		t.Errorf("expected 1 miss after first GetIssue, got %d", stats.MissCount)
	}
	if stats.HitCount != 0 {
		t.Errorf("expected 0 hits after first GetIssue, got %d", stats.HitCount)
	}
	if stats.IssueEntries != 1 {
		t.Errorf("expected 1 issue cache entry, got %d", stats.IssueEntries)
	}

	// Second GetIssue (same issue) - should be a hit
	_, err = svc.GetIssue("stats-001")
	if err != nil {
		t.Fatalf("second GetIssue failed: %v", err)
	}

	stats = svc.GetCacheStats()
	if stats.MissCount != 1 {
		t.Errorf("expected 1 miss after cache hit, got %d", stats.MissCount)
	}
	if stats.HitCount != 1 {
		t.Errorf("expected 1 hit after second GetIssue, got %d", stats.HitCount)
	}

	// ListIssues - should be a miss
	_, err = svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("ListIssues failed: %v", err)
	}

	stats = svc.GetCacheStats()
	if stats.MissCount != 2 {
		t.Errorf("expected 2 misses after ListIssues, got %d", stats.MissCount)
	}
	if stats.IssueListEntries != 1 {
		t.Errorf("expected 1 issue list cache entry, got %d", stats.IssueListEntries)
	}

	// Second ListIssues (same filter) - should be a hit
	_, err = svc.ListIssues(IssueFilter{})
	if err != nil {
		t.Fatalf("second ListIssues failed: %v", err)
	}

	stats = svc.GetCacheStats()
	if stats.HitCount != 2 {
		t.Errorf("expected 2 hits after cached ListIssues, got %d", stats.HitCount)
	}

	// GetConvoyProgress - should be a miss
	_, err = svc.GetConvoyProgress("convoy-001")
	if err != nil {
		t.Fatalf("GetConvoyProgress failed: %v", err)
	}

	stats = svc.GetCacheStats()
	if stats.MissCount != 3 {
		t.Errorf("expected 3 misses after GetConvoyProgress, got %d", stats.MissCount)
	}
	if stats.ConvoyProgressEntries != 1 {
		t.Errorf("expected 1 convoy progress cache entry, got %d", stats.ConvoyProgressEntries)
	}

	// Second GetConvoyProgress - should be a hit
	_, err = svc.GetConvoyProgress("convoy-001")
	if err != nil {
		t.Fatalf("second GetConvoyProgress failed: %v", err)
	}

	stats = svc.GetCacheStats()
	if stats.HitCount != 3 {
		t.Errorf("expected 3 hits after cached GetConvoyProgress, got %d", stats.HitCount)
	}

	// Verify TTL values in stats
	if stats.IssuesTTL != 60 {
		t.Errorf("expected IssuesTTL to be 60 seconds, got %d", stats.IssuesTTL)
	}

	// Test cache invalidation updates lastInvalidation
	beforeInvalidate := time.Now()
	time.Sleep(10 * time.Millisecond)
	svc.InvalidateCache()
	time.Sleep(10 * time.Millisecond)
	afterInvalidate := time.Now()

	stats = svc.GetCacheStats()
	if stats.LastInvalidation.Before(beforeInvalidate) || stats.LastInvalidation.After(afterInvalidate) {
		t.Errorf("expected lastInvalidation to be between %v and %v, got %v",
			beforeInvalidate, afterInvalidate, stats.LastInvalidation)
	}

	// After invalidation, all cache entries should be empty
	if stats.IssueEntries != 0 || stats.IssueListEntries != 0 || stats.ConvoyProgressEntries != 0 {
		t.Errorf("expected 0 cache entries after invalidation, got %d/%d/%d",
			stats.IssueEntries, stats.IssueListEntries, stats.ConvoyProgressEntries)
	}

	// Hit and miss counts should persist through invalidation
	if stats.HitCount != 3 || stats.MissCount != 3 {
		t.Errorf("expected 3/3 hits/misses after invalidation, got %d/%d",
			stats.HitCount, stats.MissCount)
	}
}
