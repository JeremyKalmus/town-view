// Package telemetry provides operational metrics collection for Gas Town agents.
// It captures token usage (cost tracking), git changes (audit), and test results (quality).
package telemetry

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

// TokenUsage represents token consumption for a single API request.
type TokenUsage struct {
	AgentID      string `json:"agent_id"`
	BeadID       string `json:"bead_id,omitempty"`
	Timestamp    string `json:"timestamp"`
	InputTokens  int    `json:"input_tokens"`
	OutputTokens int    `json:"output_tokens"`
	Model        string `json:"model"`
	RequestType  string `json:"request_type"` // chat, tool_use, completion
}

// GitChange represents a git commit made by an agent.
type GitChange struct {
	AgentID      string `json:"agent_id"`
	BeadID       string `json:"bead_id,omitempty"`
	Timestamp    string `json:"timestamp"`
	CommitSHA    string `json:"commit_sha"`
	Branch       string `json:"branch"`
	FilesChanged int    `json:"files_changed"`
	Insertions   int    `json:"insertions"`
	Deletions    int    `json:"deletions"`
	Message      string `json:"message"`
	DiffSummary  string `json:"diff_summary,omitempty"`
}

// TestResult represents a single test outcome.
type TestResult struct {
	AgentID      string `json:"agent_id"`
	BeadID       string `json:"bead_id,omitempty"`
	Timestamp    string `json:"timestamp"`
	TestFile     string `json:"test_file"`
	TestName     string `json:"test_name"`
	Status       string `json:"status"` // passed, failed, skipped, error
	DurationMS   int    `json:"duration_ms"`
	ErrorMessage string `json:"error_message,omitempty"`
	StackTrace   string `json:"stack_trace,omitempty"`
}

// TestRun represents an aggregated test execution.
type TestRun struct {
	AgentID    string       `json:"agent_id"`
	BeadID     string       `json:"bead_id,omitempty"`
	Timestamp  string       `json:"timestamp"`
	Command    string       `json:"command"`
	Total      int          `json:"total"`
	Passed     int          `json:"passed"`
	Failed     int          `json:"failed"`
	Skipped    int          `json:"skipped"`
	DurationMS int          `json:"duration_ms"`
	Results    []TestResult `json:"results"`
}

// TelemetryFilter specifies criteria for querying telemetry data.
type TelemetryFilter struct {
	AgentID string `json:"agent_id,omitempty"`
	BeadID  string `json:"bead_id,omitempty"`
	Rig     string `json:"rig,omitempty"`
	Since   string `json:"since,omitempty"`
	Until   string `json:"until,omitempty"`
	Limit   int    `json:"limit,omitempty"`
}

// TokenSummary aggregates token usage statistics.
type TokenSummary struct {
	TotalInput    int                          `json:"total_input"`
	TotalOutput   int                          `json:"total_output"`
	TotalCostUSD  float64                      `json:"total_cost_usd,omitempty"`
	ByModel       map[string]TokenModelSummary `json:"by_model"`
	ByAgent       map[string]TokenModelSummary `json:"by_agent"`
}

// TokenModelSummary contains input/output token counts.
type TokenModelSummary struct {
	Input  int `json:"input"`
	Output int `json:"output"`
}

// GitSummary aggregates git change statistics.
type GitSummary struct {
	TotalCommits     int            `json:"total_commits"`
	TotalFilesChanged int           `json:"total_files_changed"`
	TotalInsertions  int            `json:"total_insertions"`
	TotalDeletions   int            `json:"total_deletions"`
	ByAgent          map[string]int `json:"by_agent"` // commit count per agent
}

// TestSummary aggregates test result statistics.
type TestSummary struct {
	TotalRuns   int            `json:"total_runs"`
	TotalTests  int            `json:"total_tests"`
	TotalPassed int            `json:"total_passed"`
	TotalFailed int            `json:"total_failed"`
	TotalSkipped int           `json:"total_skipped"`
	ByAgent     map[string]int `json:"by_agent"` // run count per agent
}

// BeadTelemetry aggregates all telemetry for a single bead.
type BeadTelemetry struct {
	BeadID       string       `json:"bead_id"`
	TokenUsage   []TokenUsage `json:"token_usage"`
	GitChanges   []GitChange  `json:"git_changes"`
	TestRuns     []TestRun    `json:"test_runs"`
	TokenSummary TokenSummary `json:"token_summary"`
	GitSummary   GitSummary   `json:"git_summary"`
	TestSummary  TestSummary  `json:"test_summary"`
}

// AgentTelemetry aggregates all telemetry for a single agent.
type AgentTelemetry struct {
	AgentID      string       `json:"agent_id"`
	TokenUsage   []TokenUsage `json:"token_usage"`
	GitChanges   []GitChange  `json:"git_changes"`
	TestRuns     []TestRun    `json:"test_runs"`
	TokenSummary TokenSummary `json:"token_summary"`
	GitSummary   GitSummary   `json:"git_summary"`
	TestSummary  TestSummary  `json:"test_summary"`
}

// Collector defines the interface for telemetry collection.
type Collector interface {
	// Ingest
	RecordTokenUsage(usage TokenUsage) error
	RecordGitChange(change GitChange) error
	RecordTestRun(run TestRun) error

	// Query - Token Usage
	GetTokenUsage(filter TelemetryFilter) ([]TokenUsage, error)
	GetTokenSummary(filter TelemetryFilter) (TokenSummary, error)

	// Query - Git Changes
	GetGitChanges(filter TelemetryFilter) ([]GitChange, error)
	GetGitSummary(filter TelemetryFilter) (GitSummary, error)

	// Query - Test Results
	GetTestRuns(filter TelemetryFilter) ([]TestRun, error)
	GetTestSummary(filter TelemetryFilter) (TestSummary, error)

	// Aggregates
	GetBeadTelemetry(beadID string) (BeadTelemetry, error)
	GetAgentTelemetry(agentID string) (AgentTelemetry, error)

	// Lifecycle
	Close() error
}

// SQLiteCollector implements Collector using SQLite storage.
type SQLiteCollector struct {
	db *sql.DB
}

// NewSQLiteCollector creates a new SQLite-backed telemetry collector.
func NewSQLiteCollector(dbPath string) (*SQLiteCollector, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	c := &SQLiteCollector{db: db}
	if err := c.initSchema(); err != nil {
		db.Close()
		return nil, fmt.Errorf("init schema: %w", err)
	}

	return c, nil
}

// initSchema creates the required tables and indexes.
func (c *SQLiteCollector) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS token_usage (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		agent_id TEXT NOT NULL,
		bead_id TEXT,
		timestamp TEXT NOT NULL,
		input_tokens INTEGER NOT NULL,
		output_tokens INTEGER NOT NULL,
		model TEXT NOT NULL,
		request_type TEXT NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
	CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id ON token_usage(agent_id);
	CREATE INDEX IF NOT EXISTS idx_token_usage_bead_id ON token_usage(bead_id);

	CREATE TABLE IF NOT EXISTS git_changes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		agent_id TEXT NOT NULL,
		bead_id TEXT,
		timestamp TEXT NOT NULL,
		commit_sha TEXT NOT NULL,
		branch TEXT NOT NULL,
		files_changed INTEGER NOT NULL,
		insertions INTEGER NOT NULL,
		deletions INTEGER NOT NULL,
		message TEXT NOT NULL,
		diff_summary TEXT
	);
	CREATE INDEX IF NOT EXISTS idx_git_changes_timestamp ON git_changes(timestamp);
	CREATE INDEX IF NOT EXISTS idx_git_changes_agent_id ON git_changes(agent_id);
	CREATE INDEX IF NOT EXISTS idx_git_changes_bead_id ON git_changes(bead_id);

	CREATE TABLE IF NOT EXISTS test_runs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		agent_id TEXT NOT NULL,
		bead_id TEXT,
		timestamp TEXT NOT NULL,
		command TEXT NOT NULL,
		total INTEGER NOT NULL,
		passed INTEGER NOT NULL,
		failed INTEGER NOT NULL,
		skipped INTEGER NOT NULL,
		duration_ms INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_test_runs_timestamp ON test_runs(timestamp);
	CREATE INDEX IF NOT EXISTS idx_test_runs_agent_id ON test_runs(agent_id);
	CREATE INDEX IF NOT EXISTS idx_test_runs_bead_id ON test_runs(bead_id);

	CREATE TABLE IF NOT EXISTS test_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		run_id INTEGER NOT NULL,
		agent_id TEXT NOT NULL,
		bead_id TEXT,
		timestamp TEXT NOT NULL,
		test_file TEXT NOT NULL,
		test_name TEXT NOT NULL,
		status TEXT NOT NULL,
		duration_ms INTEGER NOT NULL,
		error_message TEXT,
		stack_trace TEXT,
		FOREIGN KEY (run_id) REFERENCES test_runs(id)
	);
	CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id);
	CREATE INDEX IF NOT EXISTS idx_test_results_agent_id ON test_results(agent_id);
	CREATE INDEX IF NOT EXISTS idx_test_results_bead_id ON test_results(bead_id);
	`
	_, err := c.db.Exec(schema)
	return err
}

// Close closes the database connection.
func (c *SQLiteCollector) Close() error {
	return c.db.Close()
}

// RecordTokenUsage stores a token usage record.
func (c *SQLiteCollector) RecordTokenUsage(usage TokenUsage) error {
	_, err := c.db.Exec(`
		INSERT INTO token_usage (agent_id, bead_id, timestamp, input_tokens, output_tokens, model, request_type)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		usage.AgentID, nullString(usage.BeadID), usage.Timestamp,
		usage.InputTokens, usage.OutputTokens, usage.Model, usage.RequestType)
	return err
}

// RecordGitChange stores a git change record.
func (c *SQLiteCollector) RecordGitChange(change GitChange) error {
	_, err := c.db.Exec(`
		INSERT INTO git_changes (agent_id, bead_id, timestamp, commit_sha, branch, files_changed, insertions, deletions, message, diff_summary)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		change.AgentID, nullString(change.BeadID), change.Timestamp,
		change.CommitSHA, change.Branch, change.FilesChanged,
		change.Insertions, change.Deletions, change.Message, nullString(change.DiffSummary))
	return err
}

// RecordTestRun stores a test run with its individual results.
func (c *SQLiteCollector) RecordTestRun(run TestRun) error {
	tx, err := c.db.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Aggregate results if not already aggregated
	if run.Total == 0 && len(run.Results) > 0 {
		run.Total = len(run.Results)
		for _, r := range run.Results {
			switch r.Status {
			case "passed":
				run.Passed++
			case "failed":
				run.Failed++
			case "skipped":
				run.Skipped++
			}
			run.DurationMS += r.DurationMS
		}
	}

	result, err := tx.Exec(`
		INSERT INTO test_runs (agent_id, bead_id, timestamp, command, total, passed, failed, skipped, duration_ms)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		run.AgentID, nullString(run.BeadID), run.Timestamp,
		run.Command, run.Total, run.Passed, run.Failed, run.Skipped, run.DurationMS)
	if err != nil {
		return fmt.Errorf("insert test run: %w", err)
	}

	runID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("get run id: %w", err)
	}

	for _, r := range run.Results {
		_, err := tx.Exec(`
			INSERT INTO test_results (run_id, agent_id, bead_id, timestamp, test_file, test_name, status, duration_ms, error_message, stack_trace)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			runID, run.AgentID, nullString(run.BeadID), run.Timestamp,
			r.TestFile, r.TestName, r.Status, r.DurationMS,
			nullString(r.ErrorMessage), nullString(r.StackTrace))
		if err != nil {
			return fmt.Errorf("insert test result: %w", err)
		}
	}

	return tx.Commit()
}

// GetTokenUsage retrieves token usage records matching the filter.
func (c *SQLiteCollector) GetTokenUsage(filter TelemetryFilter) ([]TokenUsage, error) {
	query := `SELECT agent_id, COALESCE(bead_id, ''), timestamp, input_tokens, output_tokens, model, request_type FROM token_usage WHERE 1=1`
	args := []interface{}{}

	query, args = applyFilter(query, args, filter)
	query += " ORDER BY timestamp DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filter.Limit)
	}

	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []TokenUsage
	for rows.Next() {
		var u TokenUsage
		if err := rows.Scan(&u.AgentID, &u.BeadID, &u.Timestamp, &u.InputTokens, &u.OutputTokens, &u.Model, &u.RequestType); err != nil {
			return nil, err
		}
		results = append(results, u)
	}
	return results, rows.Err()
}

// GetTokenSummary aggregates token usage statistics for the given filter.
func (c *SQLiteCollector) GetTokenSummary(filter TelemetryFilter) (TokenSummary, error) {
	summary := TokenSummary{
		ByModel: make(map[string]TokenModelSummary),
		ByAgent: make(map[string]TokenModelSummary),
	}

	usage, err := c.GetTokenUsage(filter)
	if err != nil {
		return summary, err
	}

	for _, u := range usage {
		summary.TotalInput += u.InputTokens
		summary.TotalOutput += u.OutputTokens

		// Aggregate by model
		m := summary.ByModel[u.Model]
		m.Input += u.InputTokens
		m.Output += u.OutputTokens
		summary.ByModel[u.Model] = m

		// Aggregate by agent
		a := summary.ByAgent[u.AgentID]
		a.Input += u.InputTokens
		a.Output += u.OutputTokens
		summary.ByAgent[u.AgentID] = a
	}

	return summary, nil
}

// GetGitChanges retrieves git change records matching the filter.
func (c *SQLiteCollector) GetGitChanges(filter TelemetryFilter) ([]GitChange, error) {
	query := `SELECT agent_id, COALESCE(bead_id, ''), timestamp, commit_sha, branch, files_changed, insertions, deletions, message, COALESCE(diff_summary, '') FROM git_changes WHERE 1=1`
	args := []interface{}{}

	query, args = applyFilter(query, args, filter)
	query += " ORDER BY timestamp DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filter.Limit)
	}

	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []GitChange
	for rows.Next() {
		var g GitChange
		if err := rows.Scan(&g.AgentID, &g.BeadID, &g.Timestamp, &g.CommitSHA, &g.Branch, &g.FilesChanged, &g.Insertions, &g.Deletions, &g.Message, &g.DiffSummary); err != nil {
			return nil, err
		}
		results = append(results, g)
	}
	return results, rows.Err()
}

// GetGitSummary aggregates git change statistics for the given filter.
func (c *SQLiteCollector) GetGitSummary(filter TelemetryFilter) (GitSummary, error) {
	summary := GitSummary{
		ByAgent: make(map[string]int),
	}

	changes, err := c.GetGitChanges(filter)
	if err != nil {
		return summary, err
	}

	for _, g := range changes {
		summary.TotalCommits++
		summary.TotalFilesChanged += g.FilesChanged
		summary.TotalInsertions += g.Insertions
		summary.TotalDeletions += g.Deletions
		summary.ByAgent[g.AgentID]++
	}

	return summary, nil
}

// GetTestRuns retrieves test run records matching the filter.
func (c *SQLiteCollector) GetTestRuns(filter TelemetryFilter) ([]TestRun, error) {
	query := `SELECT id, agent_id, COALESCE(bead_id, ''), timestamp, command, total, passed, failed, skipped, duration_ms FROM test_runs WHERE 1=1`
	args := []interface{}{}

	query, args = applyFilter(query, args, filter)
	query += " ORDER BY timestamp DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filter.Limit)
	}

	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []TestRun
	for rows.Next() {
		var runID int64
		var r TestRun
		if err := rows.Scan(&runID, &r.AgentID, &r.BeadID, &r.Timestamp, &r.Command, &r.Total, &r.Passed, &r.Failed, &r.Skipped, &r.DurationMS); err != nil {
			return nil, err
		}

		// Load individual results for this run
		resultRows, err := c.db.Query(`
			SELECT agent_id, COALESCE(bead_id, ''), timestamp, test_file, test_name, status, duration_ms, COALESCE(error_message, ''), COALESCE(stack_trace, '')
			FROM test_results WHERE run_id = ?`, runID)
		if err != nil {
			return nil, err
		}

		for resultRows.Next() {
			var tr TestResult
			if err := resultRows.Scan(&tr.AgentID, &tr.BeadID, &tr.Timestamp, &tr.TestFile, &tr.TestName, &tr.Status, &tr.DurationMS, &tr.ErrorMessage, &tr.StackTrace); err != nil {
				resultRows.Close()
				return nil, err
			}
			r.Results = append(r.Results, tr)
		}
		resultRows.Close()

		results = append(results, r)
	}
	return results, rows.Err()
}

// GetTestSummary aggregates test result statistics for the given filter.
func (c *SQLiteCollector) GetTestSummary(filter TelemetryFilter) (TestSummary, error) {
	summary := TestSummary{
		ByAgent: make(map[string]int),
	}

	runs, err := c.GetTestRuns(filter)
	if err != nil {
		return summary, err
	}

	for _, r := range runs {
		summary.TotalRuns++
		summary.TotalTests += r.Total
		summary.TotalPassed += r.Passed
		summary.TotalFailed += r.Failed
		summary.TotalSkipped += r.Skipped
		summary.ByAgent[r.AgentID]++
	}

	return summary, nil
}

// GetBeadTelemetry retrieves all telemetry data for a specific bead.
func (c *SQLiteCollector) GetBeadTelemetry(beadID string) (BeadTelemetry, error) {
	filter := TelemetryFilter{BeadID: beadID}

	bt := BeadTelemetry{BeadID: beadID}

	var err error
	bt.TokenUsage, err = c.GetTokenUsage(filter)
	if err != nil {
		return bt, fmt.Errorf("get token usage: %w", err)
	}

	bt.GitChanges, err = c.GetGitChanges(filter)
	if err != nil {
		return bt, fmt.Errorf("get git changes: %w", err)
	}

	bt.TestRuns, err = c.GetTestRuns(filter)
	if err != nil {
		return bt, fmt.Errorf("get test runs: %w", err)
	}

	bt.TokenSummary, err = c.GetTokenSummary(filter)
	if err != nil {
		return bt, fmt.Errorf("get token summary: %w", err)
	}

	bt.GitSummary, err = c.GetGitSummary(filter)
	if err != nil {
		return bt, fmt.Errorf("get git summary: %w", err)
	}

	bt.TestSummary, err = c.GetTestSummary(filter)
	if err != nil {
		return bt, fmt.Errorf("get test summary: %w", err)
	}

	return bt, nil
}

// GetAgentTelemetry retrieves all telemetry data for a specific agent.
func (c *SQLiteCollector) GetAgentTelemetry(agentID string) (AgentTelemetry, error) {
	filter := TelemetryFilter{AgentID: agentID}

	at := AgentTelemetry{AgentID: agentID}

	var err error
	at.TokenUsage, err = c.GetTokenUsage(filter)
	if err != nil {
		return at, fmt.Errorf("get token usage: %w", err)
	}

	at.GitChanges, err = c.GetGitChanges(filter)
	if err != nil {
		return at, fmt.Errorf("get git changes: %w", err)
	}

	at.TestRuns, err = c.GetTestRuns(filter)
	if err != nil {
		return at, fmt.Errorf("get test runs: %w", err)
	}

	at.TokenSummary, err = c.GetTokenSummary(filter)
	if err != nil {
		return at, fmt.Errorf("get token summary: %w", err)
	}

	at.GitSummary, err = c.GetGitSummary(filter)
	if err != nil {
		return at, fmt.Errorf("get git summary: %w", err)
	}

	at.TestSummary, err = c.GetTestSummary(filter)
	if err != nil {
		return at, fmt.Errorf("get test summary: %w", err)
	}

	return at, nil
}

// applyFilter adds WHERE clauses based on the filter.
func applyFilter(query string, args []interface{}, filter TelemetryFilter) (string, []interface{}) {
	if filter.AgentID != "" {
		query += " AND agent_id = ?"
		args = append(args, filter.AgentID)
	}
	if filter.BeadID != "" {
		query += " AND bead_id = ?"
		args = append(args, filter.BeadID)
	}
	if filter.Since != "" {
		query += " AND timestamp >= ?"
		args = append(args, filter.Since)
	}
	if filter.Until != "" {
		query += " AND timestamp <= ?"
		args = append(args, filter.Until)
	}
	return query, args
}

// nullString returns sql.NullString for optional string fields.
func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// Now returns the current timestamp in RFC3339 format.
func Now() string {
	return time.Now().UTC().Format(time.RFC3339)
}
