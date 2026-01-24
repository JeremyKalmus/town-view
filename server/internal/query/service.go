// Package query provides a Query Service with direct SQLite access and in-memory caching.
// It serves as the fast data access layer for Town View, replacing CLI shell-outs.
package query

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/gastown/townview/internal/events"
	"github.com/gastown/townview/internal/registry"
	"github.com/gastown/townview/internal/types"
	_ "github.com/mattn/go-sqlite3"
)

// CacheConfig holds TTL settings for different data types.
type CacheConfig struct {
	RigsTTL           time.Duration
	AgentsTTL         time.Duration
	ConvoyProgressTTL time.Duration
	IssuesTTL         time.Duration
	DependenciesTTL   time.Duration
	ActivityTTL       time.Duration
}

// DefaultCacheConfig returns the default cache configuration per ADR-013.
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		RigsTTL:           60 * time.Second,  // 1 minute
		AgentsTTL:         5 * time.Second,   // 5 seconds (live data)
		ConvoyProgressTTL: 10 * time.Second,  // 10 seconds
		IssuesTTL:         30 * time.Second,  // 30 seconds
		DependenciesTTL:   60 * time.Second,  // 1 minute
		ActivityTTL:       5 * time.Minute,   // 5 minutes
	}
}

// Config holds configuration for the Query Service.
type Config struct {
	DBPath      string      // Path to beads SQLite database
	CacheConfig CacheConfig // Cache TTL settings
}

// DefaultConfig returns a default service configuration.
func DefaultConfig() Config {
	return Config{
		DBPath:      "",
		CacheConfig: DefaultCacheConfig(),
	}
}

// cacheEntry holds a cached value with expiration time.
type cacheEntry[T any] struct {
	value     T
	expiresAt time.Time
}

// IssueFilter defines query parameters for filtering issues.
type IssueFilter struct {
	Rig      string   // Filter by rig
	Status   []string // Filter by status (any match)
	Type     []string // Filter by type (any match)
	Assignee string   // Filter by assignee
	Parent   string   // Filter by parent ID
	Convoy   string   // Filter by convoy ID
	Limit    int      // Maximum results (0 for no limit)
	Offset   int      // Skip first N results
}

// ConvoyFilter defines query parameters for filtering convoys.
type ConvoyFilter struct {
	Rig    string // Filter by rig
	Status string // Filter by status
	Limit  int    // Maximum results
	Offset int    // Skip first N results
}

// ActivityFilter defines query parameters for filtering activity events.
type ActivityFilter struct {
	Rig       string     // Filter by rig
	Type      string     // Filter by event type
	StartTime *time.Time // Events after this time
	EndTime   *time.Time // Events before this time
	Limit     int        // Maximum results
}

// DependencyNode represents a node in a dependency graph.
type DependencyNode struct {
	Issue    types.Issue      `json:"issue"`
	Children []DependencyNode `json:"children,omitempty"`
	Depth    int              `json:"depth"`
}

// DependencyGraph represents a full dependency graph from a root.
type DependencyGraph struct {
	Root  DependencyNode `json:"root"`
	Total int            `json:"total"` // Total nodes in graph
}

// RigSummary provides aggregate statistics for a rig.
type RigSummary struct {
	Rig         types.Rig              `json:"rig"`
	IssueCount  int                    `json:"issue_count"`
	OpenCount   int                    `json:"open_count"`
	ByStatus    map[string]int         `json:"by_status"`
	ByType      map[string]int         `json:"by_type"`
	AgentStates []registry.AgentState  `json:"agent_states"`
}

// SystemHealth provides overall system health information.
type SystemHealth struct {
	TotalRigs    int            `json:"total_rigs"`
	TotalAgents  int            `json:"total_agents"`
	TotalIssues  int            `json:"total_issues"`
	OpenIssues   int            `json:"open_issues"`
	AgentsByRole map[string]int `json:"agents_by_role"`
}

// Service provides fast, cached access to beads data via direct SQLite queries.
type Service struct {
	db            *sql.DB
	config        Config
	agentRegistry *registry.Registry
	eventStore    *events.Store

	// Caches with type-safe entries
	issueCache         map[string]cacheEntry[types.Issue]
	issueListCache     map[string]cacheEntry[[]types.Issue]
	dependencyCache    map[string]cacheEntry[[]types.Dependency]
	convoyProgressCache map[string]cacheEntry[types.ConvoyProgress]

	// Mutex for cache access
	mu sync.RWMutex

	// Event subscription for cache invalidation
	eventCh    <-chan events.Event
	stopCh     chan struct{}
	stoppedCh  chan struct{}
}

// New creates a new Query Service.
func New(config Config, agentRegistry *registry.Registry, eventStore *events.Store) (*Service, error) {
	if config.DBPath == "" {
		return nil, fmt.Errorf("database path is required")
	}

	db, err := sql.Open("sqlite3", config.DBPath+"?mode=ro")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	s := &Service{
		db:                  db,
		config:              config,
		agentRegistry:       agentRegistry,
		eventStore:          eventStore,
		issueCache:          make(map[string]cacheEntry[types.Issue]),
		issueListCache:      make(map[string]cacheEntry[[]types.Issue]),
		dependencyCache:     make(map[string]cacheEntry[[]types.Dependency]),
		convoyProgressCache: make(map[string]cacheEntry[types.ConvoyProgress]),
		stopCh:              make(chan struct{}),
		stoppedCh:           make(chan struct{}),
	}

	// Subscribe to events for cache invalidation
	if eventStore != nil {
		s.eventCh = eventStore.Subscribe(events.EventFilter{})
		go s.eventLoop()
	}

	return s, nil
}

// Close shuts down the Query Service.
func (s *Service) Close() error {
	close(s.stopCh)

	// Only wait for eventLoop if it was started
	if s.eventStore != nil {
		<-s.stoppedCh
		if s.eventCh != nil {
			s.eventStore.Unsubscribe(s.eventCh)
		}
	}

	return s.db.Close()
}

// eventLoop processes events for cache invalidation.
func (s *Service) eventLoop() {
	defer close(s.stoppedCh)

	for {
		select {
		case <-s.stopCh:
			return
		case event, ok := <-s.eventCh:
			if !ok {
				return
			}
			s.handleEvent(event)
		}
	}
}

// handleEvent invalidates caches based on event type.
func (s *Service) handleEvent(event events.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch {
	case strings.HasPrefix(event.Type, "bead."):
		// Invalidate issue caches
		s.issueCache = make(map[string]cacheEntry[types.Issue])
		s.issueListCache = make(map[string]cacheEntry[[]types.Issue])
		s.dependencyCache = make(map[string]cacheEntry[[]types.Dependency])
		s.convoyProgressCache = make(map[string]cacheEntry[types.ConvoyProgress])
		slog.Debug("Invalidated issue caches on bead event", "type", event.Type)

	case strings.HasPrefix(event.Type, "convoy."):
		// Invalidate convoy caches
		s.convoyProgressCache = make(map[string]cacheEntry[types.ConvoyProgress])
		slog.Debug("Invalidated convoy cache on convoy event", "type", event.Type)
	}
}

// InvalidateCache clears all caches. Useful for testing.
func (s *Service) InvalidateCache() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.issueCache = make(map[string]cacheEntry[types.Issue])
	s.issueListCache = make(map[string]cacheEntry[[]types.Issue])
	s.dependencyCache = make(map[string]cacheEntry[[]types.Dependency])
	s.convoyProgressCache = make(map[string]cacheEntry[types.ConvoyProgress])
}

// ListIssues returns issues matching the filter.
func (s *Service) ListIssues(filter IssueFilter) ([]types.Issue, error) {
	// Generate cache key
	cacheKey := fmt.Sprintf("list:%s:%v:%v:%s:%s:%s:%d:%d",
		filter.Rig, filter.Status, filter.Type, filter.Assignee,
		filter.Parent, filter.Convoy, filter.Limit, filter.Offset)

	// Check cache
	s.mu.RLock()
	if entry, ok := s.issueListCache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.RUnlock()
		return entry.value, nil
	}
	s.mu.RUnlock()

	// Query database
	issues, err := s.queryIssues(filter)
	if err != nil {
		return nil, err
	}

	// Update cache
	s.mu.Lock()
	s.issueListCache[cacheKey] = cacheEntry[[]types.Issue]{
		value:     issues,
		expiresAt: time.Now().Add(s.config.CacheConfig.IssuesTTL),
	}
	s.mu.Unlock()

	return issues, nil
}

// queryIssues executes the SQLite query for issues.
func (s *Service) queryIssues(filter IssueFilter) ([]types.Issue, error) {
	query := `
		SELECT id, title, description, status, priority, issue_type,
		       owner, assignee, created_at, created_by, updated_at,
		       closed_at, close_reason
		FROM issues
		WHERE deleted_at IS NULL AND status != 'tombstone'
	`
	args := []interface{}{}

	if filter.Rig != "" {
		query += " AND source_repo = ?"
		args = append(args, filter.Rig)
	}

	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = "?"
			args = append(args, status)
		}
		query += " AND status IN (" + strings.Join(placeholders, ",") + ")"
	}

	if len(filter.Type) > 0 {
		placeholders := make([]string, len(filter.Type))
		for i, t := range filter.Type {
			placeholders[i] = "?"
			args = append(args, t)
		}
		query += " AND issue_type IN (" + strings.Join(placeholders, ",") + ")"
	}

	if filter.Assignee != "" {
		query += " AND assignee = ?"
		args = append(args, filter.Assignee)
	}

	if filter.Parent != "" {
		// Parent is tracked via dependencies with type 'parent'
		query += ` AND id IN (
			SELECT issue_id FROM dependencies
			WHERE depends_on_id = ? AND type = 'parent'
		)`
		args = append(args, filter.Parent)
	}

	query += " ORDER BY priority ASC, updated_at DESC"

	if filter.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, filter.Limit)
	}

	if filter.Offset > 0 {
		query += " OFFSET ?"
		args = append(args, filter.Offset)
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query issues: %w", err)
	}
	defer rows.Close()

	var issues []types.Issue
	for rows.Next() {
		var issue types.Issue
		var closedAt sql.NullTime
		var closeReason sql.NullString
		var owner, assignee, createdBy sql.NullString

		if err := rows.Scan(
			&issue.ID, &issue.Title, &issue.Description,
			&issue.Status, &issue.Priority, &issue.IssueType,
			&owner, &assignee, &issue.CreatedAt, &createdBy,
			&issue.UpdatedAt, &closedAt, &closeReason,
		); err != nil {
			return nil, fmt.Errorf("failed to scan issue: %w", err)
		}

		if closedAt.Valid {
			issue.ClosedAt = &closedAt.Time
		}
		if closeReason.Valid {
			issue.CloseReason = closeReason.String
		}
		if owner.Valid {
			issue.Owner = owner.String
		}
		if assignee.Valid {
			issue.Assignee = assignee.String
		}
		if createdBy.Valid {
			issue.CreatedBy = createdBy.String
		}

		issues = append(issues, issue)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating issues: %w", err)
	}

	// Ensure non-nil slice
	if issues == nil {
		issues = []types.Issue{}
	}

	return issues, nil
}

// GetIssue returns a single issue by ID.
func (s *Service) GetIssue(issueID string) (*types.Issue, error) {
	// Check cache
	s.mu.RLock()
	if entry, ok := s.issueCache[issueID]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.RUnlock()
		result := entry.value
		return &result, nil
	}
	s.mu.RUnlock()

	// Query database
	query := `
		SELECT id, title, description, status, priority, issue_type,
		       owner, assignee, created_at, created_by, updated_at,
		       closed_at, close_reason
		FROM issues
		WHERE id = ? AND deleted_at IS NULL
	`

	var issue types.Issue
	var closedAt sql.NullTime
	var closeReason sql.NullString
	var owner, assignee, createdBy sql.NullString

	err := s.db.QueryRow(query, issueID).Scan(
		&issue.ID, &issue.Title, &issue.Description,
		&issue.Status, &issue.Priority, &issue.IssueType,
		&owner, &assignee, &issue.CreatedAt, &createdBy,
		&issue.UpdatedAt, &closedAt, &closeReason,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}

	if closedAt.Valid {
		issue.ClosedAt = &closedAt.Time
	}
	if closeReason.Valid {
		issue.CloseReason = closeReason.String
	}
	if owner.Valid {
		issue.Owner = owner.String
	}
	if assignee.Valid {
		issue.Assignee = assignee.String
	}
	if createdBy.Valid {
		issue.CreatedBy = createdBy.String
	}

	// Update cache
	s.mu.Lock()
	s.issueCache[issueID] = cacheEntry[types.Issue]{
		value:     issue,
		expiresAt: time.Now().Add(s.config.CacheConfig.IssuesTTL),
	}
	s.mu.Unlock()

	return &issue, nil
}

// GetDependencies returns blockers and blocked-by for an issue.
func (s *Service) GetDependencies(issueID string) (*types.IssueDependencies, error) {
	result := &types.IssueDependencies{
		Blockers:  []types.Issue{},
		BlockedBy: []types.Issue{},
	}

	// Get blockers (what this issue depends on)
	blockerQuery := `
		SELECT i.id, i.title, i.description, i.status, i.priority, i.issue_type,
		       i.owner, i.assignee, i.created_at, i.created_by, i.updated_at,
		       i.closed_at, i.close_reason
		FROM issues i
		INNER JOIN dependencies d ON i.id = d.depends_on_id
		WHERE d.issue_id = ? AND d.type = 'blocks' AND i.deleted_at IS NULL
	`

	blockerRows, err := s.db.Query(blockerQuery, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to query blockers: %w", err)
	}
	defer blockerRows.Close()

	for blockerRows.Next() {
		issue, err := scanIssue(blockerRows)
		if err != nil {
			return nil, err
		}
		result.Blockers = append(result.Blockers, *issue)
	}

	// Get blocked-by (what this issue blocks)
	blockedByQuery := `
		SELECT i.id, i.title, i.description, i.status, i.priority, i.issue_type,
		       i.owner, i.assignee, i.created_at, i.created_by, i.updated_at,
		       i.closed_at, i.close_reason
		FROM issues i
		INNER JOIN dependencies d ON i.id = d.issue_id
		WHERE d.depends_on_id = ? AND d.type = 'blocks' AND i.deleted_at IS NULL
	`

	blockedByRows, err := s.db.Query(blockedByQuery, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to query blocked-by: %w", err)
	}
	defer blockedByRows.Close()

	for blockedByRows.Next() {
		issue, err := scanIssue(blockedByRows)
		if err != nil {
			return nil, err
		}
		result.BlockedBy = append(result.BlockedBy, *issue)
	}

	return result, nil
}

// GetDependencyGraph returns a full dependency graph from a root issue.
func (s *Service) GetDependencyGraph(rootID string) (*DependencyGraph, error) {
	rootIssue, err := s.GetIssue(rootID)
	if err != nil {
		return nil, err
	}
	if rootIssue == nil {
		return nil, fmt.Errorf("issue not found: %s", rootID)
	}

	visited := make(map[string]bool)
	rootNode := s.buildDependencyNode(rootID, visited, 0, 10) // Max depth 10

	return &DependencyGraph{
		Root:  rootNode,
		Total: len(visited),
	}, nil
}

// buildDependencyNode recursively builds the dependency tree.
func (s *Service) buildDependencyNode(issueID string, visited map[string]bool, depth, maxDepth int) DependencyNode {
	if visited[issueID] || depth >= maxDepth {
		issue, _ := s.GetIssue(issueID)
		if issue == nil {
			return DependencyNode{Depth: depth}
		}
		return DependencyNode{Issue: *issue, Depth: depth}
	}

	visited[issueID] = true

	issue, err := s.GetIssue(issueID)
	if err != nil || issue == nil {
		return DependencyNode{Depth: depth}
	}

	node := DependencyNode{
		Issue:    *issue,
		Depth:    depth,
		Children: []DependencyNode{},
	}

	// Get children (issues that depend on this one)
	deps, err := s.GetDependencies(issueID)
	if err != nil {
		return node
	}

	for _, blocked := range deps.BlockedBy {
		if !visited[blocked.ID] {
			child := s.buildDependencyNode(blocked.ID, visited, depth+1, maxDepth)
			node.Children = append(node.Children, child)
		}
	}

	return node
}

// GetConvoyProgress returns progress statistics for a convoy.
func (s *Service) GetConvoyProgress(convoyID string) (*types.ConvoyProgress, error) {
	// Check cache
	s.mu.RLock()
	if entry, ok := s.convoyProgressCache[convoyID]; ok && time.Now().Before(entry.expiresAt) {
		s.mu.RUnlock()
		result := entry.value
		return &result, nil
	}
	s.mu.RUnlock()

	// Query tracked issues
	query := `
		SELECT i.status
		FROM issues i
		INNER JOIN dependencies d ON i.id = d.issue_id
		WHERE d.depends_on_id = ? AND d.type = 'tracks' AND i.deleted_at IS NULL
	`

	rows, err := s.db.Query(query, convoyID)
	if err != nil {
		return nil, fmt.Errorf("failed to query convoy issues: %w", err)
	}
	defer rows.Close()

	total := 0
	completed := 0
	for rows.Next() {
		var status string
		if err := rows.Scan(&status); err != nil {
			return nil, fmt.Errorf("failed to scan status: %w", err)
		}
		total++
		if status == "closed" || status == "tombstone" {
			completed++
		}
	}

	var percentage float64
	if total > 0 {
		percentage = float64(completed) / float64(total) * 100
	}

	progress := types.ConvoyProgress{
		Completed:  completed,
		Total:      total,
		Percentage: percentage,
	}

	// Update cache
	s.mu.Lock()
	s.convoyProgressCache[convoyID] = cacheEntry[types.ConvoyProgress]{
		value:     progress,
		expiresAt: time.Now().Add(s.config.CacheConfig.ConvoyProgressTTL),
	}
	s.mu.Unlock()

	return &progress, nil
}

// ListAgents returns agents from the registry, optionally filtered by rig.
func (s *Service) ListAgents(rigID string) ([]registry.AgentState, error) {
	if s.agentRegistry == nil {
		return []registry.AgentState{}, nil
	}

	var filter *registry.AgentFilter
	if rigID != "" {
		filter = &registry.AgentFilter{Rig: &rigID}
	}

	return s.agentRegistry.ListAgents(filter), nil
}

// GetAgent returns an agent by ID from the registry.
func (s *Service) GetAgent(agentID string) (*registry.AgentState, error) {
	if s.agentRegistry == nil {
		return nil, nil
	}

	return s.agentRegistry.GetAgent(agentID), nil
}

// GetRecentActivity returns recent events from the Event Store.
func (s *Service) GetRecentActivity(filter ActivityFilter) ([]events.Event, error) {
	if s.eventStore == nil {
		return []events.Event{}, nil
	}

	eventFilter := events.EventFilter{
		Type:      filter.Type,
		Rig:       filter.Rig,
		StartTime: filter.StartTime,
		EndTime:   filter.EndTime,
		Limit:     filter.Limit,
	}

	return s.eventStore.Query(eventFilter)
}

// scanIssue scans a single issue from rows.
func scanIssue(rows *sql.Rows) (*types.Issue, error) {
	var issue types.Issue
	var closedAt sql.NullTime
	var closeReason sql.NullString
	var owner, assignee, createdBy sql.NullString

	if err := rows.Scan(
		&issue.ID, &issue.Title, &issue.Description,
		&issue.Status, &issue.Priority, &issue.IssueType,
		&owner, &assignee, &issue.CreatedAt, &createdBy,
		&issue.UpdatedAt, &closedAt, &closeReason,
	); err != nil {
		return nil, fmt.Errorf("failed to scan issue: %w", err)
	}

	if closedAt.Valid {
		issue.ClosedAt = &closedAt.Time
	}
	if closeReason.Valid {
		issue.CloseReason = closeReason.String
	}
	if owner.Valid {
		issue.Owner = owner.String
	}
	if assignee.Valid {
		issue.Assignee = assignee.String
	}
	if createdBy.Valid {
		issue.CreatedBy = createdBy.String
	}

	return &issue, nil
}
