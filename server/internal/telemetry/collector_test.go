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
