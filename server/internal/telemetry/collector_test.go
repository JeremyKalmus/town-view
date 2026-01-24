package telemetry

import (
	"os"
	"testing"
	"time"
)

// createTestCollector creates a SQLiteCollector with a temporary database.
func createTestCollector(t *testing.T) (*SQLiteCollector, func()) {
	t.Helper()
	tmpFile, err := os.CreateTemp("", "telemetry_test_*.db")
	if err != nil {
		t.Fatalf("create temp file: %v", err)
	}
	tmpFile.Close()

	collector, err := NewSQLiteCollector(tmpFile.Name())
	if err != nil {
		os.Remove(tmpFile.Name())
		t.Fatalf("create collector: %v", err)
	}

	cleanup := func() {
		collector.Close()
		os.Remove(tmpFile.Name())
	}

	return collector, cleanup
}

// TestTelemetry_RecordTokenUsage_Queryable verifies token usage can be recorded and queried.
// AC-1: Token usage is recorded and queryable
func TestTelemetry_RecordTokenUsage_Queryable(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Record token usage
	usage := TokenUsage{
		AgentID:      "agent-1",
		BeadID:       "bead-123",
		Timestamp:    "2026-01-24T10:00:00Z",
		InputTokens:  1000,
		OutputTokens: 500,
		Model:        "claude-opus-4-5-20251101",
		RequestType:  "chat",
	}

	if err := collector.RecordTokenUsage(usage); err != nil {
		t.Fatalf("RecordTokenUsage failed: %v", err)
	}

	// Query by agent
	results, err := collector.GetTokenUsage(TelemetryFilter{AgentID: "agent-1"})
	if err != nil {
		t.Fatalf("GetTokenUsage failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].InputTokens != 1000 {
		t.Errorf("expected InputTokens=1000, got %d", results[0].InputTokens)
	}
	if results[0].OutputTokens != 500 {
		t.Errorf("expected OutputTokens=500, got %d", results[0].OutputTokens)
	}

	// Query by bead
	results, err = collector.GetTokenUsage(TelemetryFilter{BeadID: "bead-123"})
	if err != nil {
		t.Fatalf("GetTokenUsage by bead failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result by bead, got %d", len(results))
	}
	if results[0].Model != "claude-opus-4-5-20251101" {
		t.Errorf("expected Model=claude-opus-4-5-20251101, got %s", results[0].Model)
	}

	// Query non-existent agent returns empty
	results, err = collector.GetTokenUsage(TelemetryFilter{AgentID: "nonexistent"})
	if err != nil {
		t.Fatalf("GetTokenUsage for nonexistent failed: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results for nonexistent agent, got %d", len(results))
	}
}

// TestTelemetry_RecordGitChange_WithDiff verifies git changes include diff summary.
// AC-2: Git changes are recorded with diff summary
func TestTelemetry_RecordGitChange_WithDiff(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	diffSummary := `+++ b/main.go
@@ -1,5 +1,6 @@
 package main
+import "fmt"
 func main() {`

	change := GitChange{
		AgentID:      "agent-1",
		BeadID:       "bead-456",
		Timestamp:    "2026-01-24T11:00:00Z",
		CommitSHA:    "abc123def456",
		Branch:       "feature/new-thing",
		FilesChanged: 3,
		Insertions:   50,
		Deletions:    10,
		Message:      "feat: add new feature",
		DiffSummary:  diffSummary,
	}

	if err := collector.RecordGitChange(change); err != nil {
		t.Fatalf("RecordGitChange failed: %v", err)
	}

	// Query and verify diff summary is preserved
	results, err := collector.GetGitChanges(TelemetryFilter{BeadID: "bead-456"})
	if err != nil {
		t.Fatalf("GetGitChanges failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].DiffSummary != diffSummary {
		t.Errorf("diff summary not preserved:\nexpected: %s\ngot: %s", diffSummary, results[0].DiffSummary)
	}
	if results[0].FilesChanged != 3 {
		t.Errorf("expected FilesChanged=3, got %d", results[0].FilesChanged)
	}
	if results[0].Insertions != 50 {
		t.Errorf("expected Insertions=50, got %d", results[0].Insertions)
	}
	if results[0].Deletions != 10 {
		t.Errorf("expected Deletions=10, got %d", results[0].Deletions)
	}
	if results[0].CommitSHA != "abc123def456" {
		t.Errorf("expected CommitSHA=abc123def456, got %s", results[0].CommitSHA)
	}
}

// TestTelemetry_RecordTestRun_AggregatesResults verifies test runs aggregate individual results.
// AC-3: Test runs aggregate individual results
func TestTelemetry_RecordTestRun_AggregatesResults(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Create a test run with individual results (no pre-aggregated totals)
	run := TestRun{
		AgentID:   "agent-1",
		BeadID:    "bead-789",
		Timestamp: "2026-01-24T12:00:00Z",
		Command:   "go test ./...",
		Results: []TestResult{
			{TestFile: "main_test.go", TestName: "TestA", Status: "passed", DurationMS: 100},
			{TestFile: "main_test.go", TestName: "TestB", Status: "passed", DurationMS: 150},
			{TestFile: "util_test.go", TestName: "TestC", Status: "failed", DurationMS: 200, ErrorMessage: "assertion failed"},
			{TestFile: "util_test.go", TestName: "TestD", Status: "skipped", DurationMS: 0},
		},
	}

	if err := collector.RecordTestRun(run); err != nil {
		t.Fatalf("RecordTestRun failed: %v", err)
	}

	// Query and verify aggregation
	results, err := collector.GetTestRuns(TelemetryFilter{BeadID: "bead-789"})
	if err != nil {
		t.Fatalf("GetTestRuns failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 run, got %d", len(results))
	}

	r := results[0]
	if r.Total != 4 {
		t.Errorf("expected Total=4, got %d", r.Total)
	}
	if r.Passed != 2 {
		t.Errorf("expected Passed=2, got %d", r.Passed)
	}
	if r.Failed != 1 {
		t.Errorf("expected Failed=1, got %d", r.Failed)
	}
	if r.Skipped != 1 {
		t.Errorf("expected Skipped=1, got %d", r.Skipped)
	}
	if r.DurationMS != 450 {
		t.Errorf("expected DurationMS=450, got %d", r.DurationMS)
	}

	// Verify individual results are preserved
	if len(r.Results) != 4 {
		t.Errorf("expected 4 individual results, got %d", len(r.Results))
	}
}

// TestTelemetry_GetSummary_AggregatesTimeRange verifies summaries aggregate across time ranges.
// AC-4: Summaries aggregate across time range
func TestTelemetry_GetSummary_AggregatesTimeRange(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Record multiple token usages across different times
	usages := []TokenUsage{
		{AgentID: "agent-1", Timestamp: "2026-01-24T08:00:00Z", InputTokens: 100, OutputTokens: 50, Model: "claude-opus-4-5-20251101", RequestType: "chat"},
		{AgentID: "agent-1", Timestamp: "2026-01-24T10:00:00Z", InputTokens: 200, OutputTokens: 100, Model: "claude-opus-4-5-20251101", RequestType: "chat"},
		{AgentID: "agent-2", Timestamp: "2026-01-24T12:00:00Z", InputTokens: 300, OutputTokens: 150, Model: "claude-sonnet", RequestType: "tool_use"},
		{AgentID: "agent-1", Timestamp: "2026-01-24T14:00:00Z", InputTokens: 400, OutputTokens: 200, Model: "claude-opus-4-5-20251101", RequestType: "chat"},
		{AgentID: "agent-2", Timestamp: "2026-01-24T16:00:00Z", InputTokens: 500, OutputTokens: 250, Model: "claude-sonnet", RequestType: "completion"},
	}

	for _, u := range usages {
		if err := collector.RecordTokenUsage(u); err != nil {
			t.Fatalf("RecordTokenUsage failed: %v", err)
		}
	}

	// Get summary for time range 09:00-13:00 (should include entries at 10:00 and 12:00)
	summary, err := collector.GetTokenSummary(TelemetryFilter{
		Since: "2026-01-24T09:00:00Z",
		Until: "2026-01-24T13:00:00Z",
	})
	if err != nil {
		t.Fatalf("GetTokenSummary failed: %v", err)
	}

	// Should include: 10:00 (200+100) and 12:00 (300+150)
	expectedInput := 200 + 300
	expectedOutput := 100 + 150
	if summary.TotalInput != expectedInput {
		t.Errorf("expected TotalInput=%d, got %d", expectedInput, summary.TotalInput)
	}
	if summary.TotalOutput != expectedOutput {
		t.Errorf("expected TotalOutput=%d, got %d", expectedOutput, summary.TotalOutput)
	}

	// Verify by-model aggregation
	if opus, ok := summary.ByModel["claude-opus-4-5-20251101"]; !ok {
		t.Error("expected claude-opus-4-5-20251101 in ByModel")
	} else {
		if opus.Input != 200 {
			t.Errorf("expected opus input=200, got %d", opus.Input)
		}
	}

	if sonnet, ok := summary.ByModel["claude-sonnet"]; !ok {
		t.Error("expected claude-sonnet in ByModel")
	} else {
		if sonnet.Input != 300 {
			t.Errorf("expected sonnet input=300, got %d", sonnet.Input)
		}
	}

	// Verify by-agent aggregation
	if agent1, ok := summary.ByAgent["agent-1"]; !ok {
		t.Error("expected agent-1 in ByAgent")
	} else {
		if agent1.Input != 200 {
			t.Errorf("expected agent-1 input=200, got %d", agent1.Input)
		}
	}

	if agent2, ok := summary.ByAgent["agent-2"]; !ok {
		t.Error("expected agent-2 in ByAgent")
	} else {
		if agent2.Input != 300 {
			t.Errorf("expected agent-2 input=300, got %d", agent2.Input)
		}
	}
}

// TestTelemetry_GetBeadTelemetry_CombinesAllTypes verifies bead telemetry combines all data types.
// AC-5: Bead telemetry shows all related data
func TestTelemetry_GetBeadTelemetry_CombinesAllTypes(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	beadID := "bead-combine-test"
	ts := time.Now().UTC().Format(time.RFC3339)

	// Record token usage for the bead
	if err := collector.RecordTokenUsage(TokenUsage{
		AgentID:      "agent-1",
		BeadID:       beadID,
		Timestamp:    ts,
		InputTokens:  1000,
		OutputTokens: 500,
		Model:        "claude-opus-4-5-20251101",
		RequestType:  "chat",
	}); err != nil {
		t.Fatalf("RecordTokenUsage failed: %v", err)
	}

	// Record git change for the bead
	if err := collector.RecordGitChange(GitChange{
		AgentID:      "agent-1",
		BeadID:       beadID,
		Timestamp:    ts,
		CommitSHA:    "sha123",
		Branch:       "main",
		FilesChanged: 5,
		Insertions:   100,
		Deletions:    25,
		Message:      "feat: implement feature",
		DiffSummary:  "+++ added code",
	}); err != nil {
		t.Fatalf("RecordGitChange failed: %v", err)
	}

	// Record test run for the bead
	if err := collector.RecordTestRun(TestRun{
		AgentID:    "agent-1",
		BeadID:     beadID,
		Timestamp:  ts,
		Command:    "go test ./...",
		Total:      10,
		Passed:     9,
		Failed:     1,
		Skipped:    0,
		DurationMS: 5000,
		Results: []TestResult{
			{TestFile: "test.go", TestName: "Test1", Status: "passed", DurationMS: 100},
		},
	}); err != nil {
		t.Fatalf("RecordTestRun failed: %v", err)
	}

	// Also record data for a DIFFERENT bead (should not appear in results)
	if err := collector.RecordTokenUsage(TokenUsage{
		AgentID:      "agent-2",
		BeadID:       "other-bead",
		Timestamp:    ts,
		InputTokens:  9999,
		OutputTokens: 9999,
		Model:        "claude-sonnet",
		RequestType:  "chat",
	}); err != nil {
		t.Fatalf("RecordTokenUsage for other bead failed: %v", err)
	}

	// Get bead telemetry
	bt, err := collector.GetBeadTelemetry(beadID)
	if err != nil {
		t.Fatalf("GetBeadTelemetry failed: %v", err)
	}

	// Verify bead ID
	if bt.BeadID != beadID {
		t.Errorf("expected BeadID=%s, got %s", beadID, bt.BeadID)
	}

	// Verify token usage is present
	if len(bt.TokenUsage) != 1 {
		t.Errorf("expected 1 token usage, got %d", len(bt.TokenUsage))
	}
	if bt.TokenSummary.TotalInput != 1000 {
		t.Errorf("expected token summary input=1000, got %d", bt.TokenSummary.TotalInput)
	}

	// Verify git changes are present
	if len(bt.GitChanges) != 1 {
		t.Errorf("expected 1 git change, got %d", len(bt.GitChanges))
	}
	if bt.GitSummary.TotalCommits != 1 {
		t.Errorf("expected 1 total commit, got %d", bt.GitSummary.TotalCommits)
	}
	if bt.GitSummary.TotalInsertions != 100 {
		t.Errorf("expected 100 insertions, got %d", bt.GitSummary.TotalInsertions)
	}

	// Verify test runs are present
	if len(bt.TestRuns) != 1 {
		t.Errorf("expected 1 test run, got %d", len(bt.TestRuns))
	}
	if bt.TestSummary.TotalRuns != 1 {
		t.Errorf("expected 1 total run, got %d", bt.TestSummary.TotalRuns)
	}
	if bt.TestSummary.TotalPassed != 9 {
		t.Errorf("expected 9 passed, got %d", bt.TestSummary.TotalPassed)
	}
	if bt.TestSummary.TotalFailed != 1 {
		t.Errorf("expected 1 failed, got %d", bt.TestSummary.TotalFailed)
	}

	// Verify other bead's data is NOT included
	for _, u := range bt.TokenUsage {
		if u.BeadID == "other-bead" {
			t.Error("other bead's token usage should not be included")
		}
	}
}

// TestNewSQLiteCollector verifies collector creation and cleanup.
func TestNewSQLiteCollector(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	if collector == nil {
		t.Fatal("collector should not be nil")
	}
	if collector.db == nil {
		t.Fatal("collector.db should not be nil")
	}
}

// TestCollectorInterfaceCompliance ensures SQLiteCollector implements Collector.
func TestCollectorInterfaceCompliance(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	var _ Collector = collector // Compile-time check
}

// TestTelemetry_RecordTestRun_WithCommitSHA verifies commit_sha is recorded and propagated.
// ADR-014 AC-1, AC-2: TestRun has commit_sha, test_results inherits from parent run
func TestTelemetry_RecordTestRun_WithCommitSHA(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	run := TestRun{
		AgentID:    "agent-1",
		BeadID:     "bead-sha-test",
		Timestamp:  "2026-01-24T12:00:00Z",
		CommitSHA:  "abc123def456789",
		Branch:     "feature/test-tracking",
		Command:    "go test ./...",
		Total:      3,
		Passed:     2,
		Failed:     1,
		Skipped:    0,
		DurationMS: 500,
		Results: []TestResult{
			{TestFile: "main_test.go", TestName: "TestA", Status: "passed", DurationMS: 100},
			{TestFile: "main_test.go", TestName: "TestB", Status: "passed", DurationMS: 150},
			{TestFile: "util_test.go", TestName: "TestC", Status: "failed", DurationMS: 250, ErrorMessage: "assertion failed"},
		},
	}

	if err := collector.RecordTestRun(run); err != nil {
		t.Fatalf("RecordTestRun failed: %v", err)
	}

	// Query and verify commit_sha and branch are preserved
	results, err := collector.GetTestRuns(TelemetryFilter{BeadID: "bead-sha-test"})
	if err != nil {
		t.Fatalf("GetTestRuns failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 run, got %d", len(results))
	}

	r := results[0]
	if r.CommitSHA != "abc123def456789" {
		t.Errorf("expected CommitSHA=abc123def456789, got %s", r.CommitSHA)
	}
	if r.Branch != "feature/test-tracking" {
		t.Errorf("expected Branch=feature/test-tracking, got %s", r.Branch)
	}

	// Verify individual results inherit commit_sha from parent run
	if len(r.Results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(r.Results))
	}
	for i, tr := range r.Results {
		if tr.CommitSHA != "abc123def456789" {
			t.Errorf("result %d: expected CommitSHA=abc123def456789, got %s", i, tr.CommitSHA)
		}
	}
}

// TestTelemetry_RecordTestRun_WithoutCommitSHA verifies runs without commit_sha still work.
func TestTelemetry_RecordTestRun_WithoutCommitSHA(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Record a test run without commit_sha (backwards compatibility)
	run := TestRun{
		AgentID:    "agent-1",
		BeadID:     "bead-no-sha",
		Timestamp:  "2026-01-24T12:00:00Z",
		Command:    "go test ./...",
		Total:      1,
		Passed:     1,
		DurationMS: 100,
		Results: []TestResult{
			{TestFile: "test.go", TestName: "Test1", Status: "passed", DurationMS: 100},
		},
	}

	if err := collector.RecordTestRun(run); err != nil {
		t.Fatalf("RecordTestRun failed: %v", err)
	}

	results, err := collector.GetTestRuns(TelemetryFilter{BeadID: "bead-no-sha"})
	if err != nil {
		t.Fatalf("GetTestRuns failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 run, got %d", len(results))
	}

	// CommitSHA and Branch should be empty strings (not nil/null issues)
	r := results[0]
	if r.CommitSHA != "" {
		t.Errorf("expected empty CommitSHA, got %s", r.CommitSHA)
	}
	if r.Branch != "" {
		t.Errorf("expected empty Branch, got %s", r.Branch)
	}
}

// TestTelemetry_GetTestHistory_ReturnsChronologicalResults verifies test history is returned in order.
// ADR-014 AC-3: Test history returns chronological results
func TestTelemetry_GetTestHistory_ReturnsChronologicalResults(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Record multiple test results for the same test at different times
	runs := []TestRun{
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T10:00:00Z",
			CommitSHA: "commit1",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "main_test.go", TestName: "TestFoo", Status: "passed", DurationMS: 100},
			},
		},
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T11:00:00Z",
			CommitSHA: "commit2",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "main_test.go", TestName: "TestFoo", Status: "passed", DurationMS: 110},
			},
		},
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T12:00:00Z",
			CommitSHA: "commit3",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "main_test.go", TestName: "TestFoo", Status: "failed", DurationMS: 120, ErrorMessage: "assertion failed"},
			},
		},
	}

	for _, run := range runs {
		if err := collector.RecordTestRun(run); err != nil {
			t.Fatalf("RecordTestRun failed: %v", err)
		}
	}

	// Get test history
	history, err := collector.GetTestHistory("TestFoo", 0)
	if err != nil {
		t.Fatalf("GetTestHistory failed: %v", err)
	}

	// Should return 3 entries, most recent first
	if len(history) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(history))
	}

	// Verify order (most recent first)
	if history[0].Timestamp != "2026-01-24T12:00:00Z" {
		t.Errorf("expected first entry at 12:00, got %s", history[0].Timestamp)
	}
	if history[0].Status != "failed" {
		t.Errorf("expected first entry status=failed, got %s", history[0].Status)
	}
	if history[0].CommitSHA != "commit3" {
		t.Errorf("expected first entry commit=commit3, got %s", history[0].CommitSHA)
	}

	if history[2].Timestamp != "2026-01-24T10:00:00Z" {
		t.Errorf("expected last entry at 10:00, got %s", history[2].Timestamp)
	}
	if history[2].Status != "passed" {
		t.Errorf("expected last entry status=passed, got %s", history[2].Status)
	}

	// Test with limit
	limited, err := collector.GetTestHistory("TestFoo", 2)
	if err != nil {
		t.Fatalf("GetTestHistory with limit failed: %v", err)
	}
	if len(limited) != 2 {
		t.Errorf("expected 2 entries with limit, got %d", len(limited))
	}

	// Test non-existent test
	empty, err := collector.GetTestHistory("TestNonExistent", 0)
	if err != nil {
		t.Fatalf("GetTestHistory for non-existent test failed: %v", err)
	}
	if len(empty) != 0 {
		t.Errorf("expected 0 entries for non-existent test, got %d", len(empty))
	}
}

// TestTelemetry_GetLastPassedCommit_FindsMostRecentPass verifies correct commit is returned.
// ADR-014 AC-4: GetLastPassedCommit returns most recent passing commit
func TestTelemetry_GetLastPassedCommit_FindsMostRecentPass(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Record test results with varying statuses
	runs := []TestRun{
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T10:00:00Z",
			CommitSHA: "commit-pass-1",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "test.go", TestName: "TestBar", Status: "passed", DurationMS: 100},
			},
		},
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T11:00:00Z",
			CommitSHA: "commit-fail-1",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "test.go", TestName: "TestBar", Status: "failed", DurationMS: 100},
			},
		},
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T12:00:00Z",
			CommitSHA: "commit-pass-2",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "test.go", TestName: "TestBar", Status: "passed", DurationMS: 100},
			},
		},
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T13:00:00Z",
			CommitSHA: "commit-fail-2",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "test.go", TestName: "TestBar", Status: "failed", DurationMS: 100},
			},
		},
	}

	for _, run := range runs {
		if err := collector.RecordTestRun(run); err != nil {
			t.Fatalf("RecordTestRun failed: %v", err)
		}
	}

	// Get last passed commit
	commit, err := collector.GetLastPassedCommit("TestBar")
	if err != nil {
		t.Fatalf("GetLastPassedCommit failed: %v", err)
	}

	// Should return commit-pass-2 (most recent pass)
	if commit != "commit-pass-2" {
		t.Errorf("expected commit-pass-2, got %s", commit)
	}

	// Test for a test that never passed
	runs2 := []TestRun{
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T10:00:00Z",
			CommitSHA: "commit-x",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "test.go", TestName: "TestNeverPassed", Status: "failed", DurationMS: 100},
			},
		},
	}
	for _, run := range runs2 {
		if err := collector.RecordTestRun(run); err != nil {
			t.Fatalf("RecordTestRun failed: %v", err)
		}
	}

	noCommit, err := collector.GetLastPassedCommit("TestNeverPassed")
	if err != nil {
		t.Fatalf("GetLastPassedCommit for never-passed test failed: %v", err)
	}
	if noCommit != "" {
		t.Errorf("expected empty string for never-passed test, got %s", noCommit)
	}

	// Test for non-existent test
	nonExistent, err := collector.GetLastPassedCommit("TestNonExistent")
	if err != nil {
		t.Fatalf("GetLastPassedCommit for non-existent test failed: %v", err)
	}
	if nonExistent != "" {
		t.Errorf("expected empty string for non-existent test, got %s", nonExistent)
	}
}

// TestTelemetry_GetRegressions_DetectsNewFailures verifies regression detection works.
// ADR-014 AC-5: GetRegressions detects tests that were passing but now fail
func TestTelemetry_GetRegressions_DetectsNewFailures(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Set up test scenario:
	// TestStable: passed -> passed (no regression)
	// TestRegressed: passed -> failed (regression)
	// TestAlwaysFailed: failed -> failed (not a regression since no prior pass)
	// TestRecovered: failed -> passed (not a regression)

	runs := []TestRun{
		// Day 1: Initial state
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T10:00:00Z",
			CommitSHA: "commit-day1",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "stable_test.go", TestName: "TestStable", Status: "passed", DurationMS: 100},
				{TestFile: "regressed_test.go", TestName: "TestRegressed", Status: "passed", DurationMS: 100},
				{TestFile: "always_failed_test.go", TestName: "TestAlwaysFailed", Status: "failed", DurationMS: 100},
				{TestFile: "recovered_test.go", TestName: "TestRecovered", Status: "failed", DurationMS: 100},
			},
		},
		// Day 2: After changes
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T14:00:00Z",
			CommitSHA: "commit-day2",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "stable_test.go", TestName: "TestStable", Status: "passed", DurationMS: 100},
				{TestFile: "regressed_test.go", TestName: "TestRegressed", Status: "failed", DurationMS: 100, ErrorMessage: "expected true, got false"},
				{TestFile: "always_failed_test.go", TestName: "TestAlwaysFailed", Status: "failed", DurationMS: 100},
				{TestFile: "recovered_test.go", TestName: "TestRecovered", Status: "passed", DurationMS: 100},
			},
		},
	}

	for _, run := range runs {
		if err := collector.RecordTestRun(run); err != nil {
			t.Fatalf("RecordTestRun failed: %v", err)
		}
	}

	// Get regressions since noon on day 2
	regressions, err := collector.GetRegressions("2026-01-24T12:00:00Z")
	if err != nil {
		t.Fatalf("GetRegressions failed: %v", err)
	}

	// Should only find TestRegressed as a regression
	// TestAlwaysFailed is not a regression because it never passed
	// TestStable and TestRecovered are not regressions because they're passing
	if len(regressions) != 1 {
		t.Fatalf("expected 1 regression, got %d", len(regressions))
	}

	reg := regressions[0]
	if reg.TestName != "TestRegressed" {
		t.Errorf("expected TestRegressed, got %s", reg.TestName)
	}
	if reg.TestFile != "regressed_test.go" {
		t.Errorf("expected regressed_test.go, got %s", reg.TestFile)
	}
	if reg.LastPassedCommit != "commit-day1" {
		t.Errorf("expected LastPassedCommit=commit-day1, got %s", reg.LastPassedCommit)
	}
	if reg.FirstFailedCommit != "commit-day2" {
		t.Errorf("expected FirstFailedCommit=commit-day2, got %s", reg.FirstFailedCommit)
	}
	if reg.ErrorMessage != "expected true, got false" {
		t.Errorf("expected error message 'expected true, got false', got '%s'", reg.ErrorMessage)
	}

	// Test with no regressions
	noRegressions, err := collector.GetRegressions("2026-01-25T00:00:00Z")
	if err != nil {
		t.Fatalf("GetRegressions with future date failed: %v", err)
	}
	if len(noRegressions) != 0 {
		t.Errorf("expected 0 regressions for future date, got %d", len(noRegressions))
	}
}

// TestTelemetry_GetTestSuiteStatus_ReturnsAllTestsWithLastPassed verifies suite status is complete.
// ADR-014 AC-5: GetTestSuiteStatus returns all tests with last_passed info
func TestTelemetry_GetTestSuiteStatus_ReturnsAllTestsWithLastPassed(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	// Set up tests with various histories
	runs := []TestRun{
		// First run
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T10:00:00Z",
			CommitSHA: "commit1",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "a_test.go", TestName: "TestA", Status: "passed", DurationMS: 100},
				{TestFile: "b_test.go", TestName: "TestB", Status: "passed", DurationMS: 100},
				{TestFile: "c_test.go", TestName: "TestC", Status: "failed", DurationMS: 100},
			},
		},
		// Second run
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T11:00:00Z",
			CommitSHA: "commit2",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "a_test.go", TestName: "TestA", Status: "passed", DurationMS: 100},
				{TestFile: "b_test.go", TestName: "TestB", Status: "failed", DurationMS: 100},
				{TestFile: "c_test.go", TestName: "TestC", Status: "failed", DurationMS: 100},
			},
		},
		// Third run
		{
			AgentID:   "agent-1",
			Timestamp: "2026-01-24T12:00:00Z",
			CommitSHA: "commit3",
			Command:   "go test",
			Results: []TestResult{
				{TestFile: "a_test.go", TestName: "TestA", Status: "passed", DurationMS: 100},
				{TestFile: "b_test.go", TestName: "TestB", Status: "failed", DurationMS: 100},
				{TestFile: "c_test.go", TestName: "TestC", Status: "passed", DurationMS: 100},
			},
		},
	}

	for _, run := range runs {
		if err := collector.RecordTestRun(run); err != nil {
			t.Fatalf("RecordTestRun failed: %v", err)
		}
	}

	// Get test suite status
	status, err := collector.GetTestSuiteStatus()
	if err != nil {
		t.Fatalf("GetTestSuiteStatus failed: %v", err)
	}

	// Should have 3 tests
	if len(status) != 3 {
		t.Fatalf("expected 3 tests in status, got %d", len(status))
	}

	// Create a map for easier lookup
	statusMap := make(map[string]TestStatus)
	for _, s := range status {
		statusMap[s.TestName] = s
	}

	// Verify TestA: always passed, 0 consecutive failures
	if a, ok := statusMap["TestA"]; !ok {
		t.Error("TestA not found in status")
	} else {
		if a.CurrentStatus != "passed" {
			t.Errorf("TestA: expected current status=passed, got %s", a.CurrentStatus)
		}
		if a.LastPassedCommit != "commit3" {
			t.Errorf("TestA: expected last passed commit=commit3, got %s", a.LastPassedCommit)
		}
		if a.TotalRuns != 3 {
			t.Errorf("TestA: expected 3 total runs, got %d", a.TotalRuns)
		}
		if a.FailCount != 0 {
			t.Errorf("TestA: expected 0 fail count, got %d", a.FailCount)
		}
	}

	// Verify TestB: passed once, then failed twice, 2 consecutive failures
	if b, ok := statusMap["TestB"]; !ok {
		t.Error("TestB not found in status")
	} else {
		if b.CurrentStatus != "failed" {
			t.Errorf("TestB: expected current status=failed, got %s", b.CurrentStatus)
		}
		if b.LastPassedCommit != "commit1" {
			t.Errorf("TestB: expected last passed commit=commit1, got %s", b.LastPassedCommit)
		}
		if b.TotalRuns != 3 {
			t.Errorf("TestB: expected 3 total runs, got %d", b.TotalRuns)
		}
		if b.FailCount != 2 {
			t.Errorf("TestB: expected 2 consecutive failures, got %d", b.FailCount)
		}
	}

	// Verify TestC: failed twice, then passed, 0 consecutive failures
	if c, ok := statusMap["TestC"]; !ok {
		t.Error("TestC not found in status")
	} else {
		if c.CurrentStatus != "passed" {
			t.Errorf("TestC: expected current status=passed, got %s", c.CurrentStatus)
		}
		if c.LastPassedCommit != "commit3" {
			t.Errorf("TestC: expected last passed commit=commit3, got %s", c.LastPassedCommit)
		}
		if c.TotalRuns != 3 {
			t.Errorf("TestC: expected 3 total runs, got %d", c.TotalRuns)
		}
		if c.FailCount != 0 {
			t.Errorf("TestC: expected 0 consecutive failures (recovered), got %d", c.FailCount)
		}
	}
}

// TestTelemetry_GetTestSuiteStatus_EmptyDatabase returns empty slice.
func TestTelemetry_GetTestSuiteStatus_EmptyDatabase(t *testing.T) {
	collector, cleanup := createTestCollector(t)
	defer cleanup()

	status, err := collector.GetTestSuiteStatus()
	if err != nil {
		t.Fatalf("GetTestSuiteStatus on empty DB failed: %v", err)
	}
	if len(status) != 0 {
		t.Errorf("expected 0 tests in empty DB, got %d", len(status))
	}
}
