// Package main provides a CLI tool to record test results to townview telemetry.
//
// Usage:
//
//	go test -json ./... | record-tests --agent crew/jeremy --bead to-abc123
//	go test -json ./... | record-tests  # agent ID auto-detected from environment
//
// The tool parses go test -json output, extracts test results, and POSTs them
// to the townview telemetry endpoint.
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

// TestEvent represents a single event from `go test -json` output.
// See: https://pkg.go.dev/cmd/test2json
type TestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test"`
	Elapsed float64   `json:"Elapsed"`
	Output  string    `json:"Output"`
}

// TestResult represents a single test outcome for the telemetry API.
type TestResult struct {
	TestFile     string `json:"test_file"`
	TestName     string `json:"test_name"`
	Status       string `json:"status"`
	DurationMS   int    `json:"duration_ms"`
	ErrorMessage string `json:"error_message,omitempty"`
}

// TestRun represents an aggregated test execution for the telemetry API.
type TestRun struct {
	AgentID    string       `json:"agent_id"`
	BeadID     string       `json:"bead_id,omitempty"`
	Timestamp  string       `json:"timestamp"`
	CommitSHA  string       `json:"commit_sha,omitempty"`
	Branch     string       `json:"branch,omitempty"`
	Command    string       `json:"command"`
	Total      int          `json:"total"`
	Passed     int          `json:"passed"`
	Failed     int          `json:"failed"`
	Skipped    int          `json:"skipped"`
	DurationMS int          `json:"duration_ms"`
	Results    []TestResult `json:"results"`
}

func main() {
	var (
		agentID  string
		beadID   string
		endpoint string
		command  string
		dryRun   bool
	)

	flag.StringVar(&agentID, "agent", "", "Agent ID (e.g., 'crew/jeremy'). Auto-detected from environment if not provided.")
	flag.StringVar(&beadID, "bead", "", "Bead ID for the current work (e.g., 'to-abc123')")
	flag.StringVar(&endpoint, "endpoint", "http://localhost:8080/api/telemetry/tests", "Telemetry API endpoint")
	flag.StringVar(&command, "command", "go test -json ./...", "Test command that was run")
	flag.BoolVar(&dryRun, "dry-run", false, "Parse and print results without posting")
	flag.Parse()

	// Auto-detect agent ID if not provided
	if agentID == "" {
		agentID = detectAgentID()
		if agentID == "" {
			fmt.Fprintln(os.Stderr, "error: agent ID required (use --agent or set GT_ROLE environment)")
			os.Exit(1)
		}
	}

	// Parse go test -json from stdin
	results, totalDuration, err := parseGoTestJSON(os.Stdin)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error parsing test output: %v\n", err)
		os.Exit(1)
	}

	if len(results) == 0 {
		fmt.Fprintln(os.Stderr, "no test results found in input")
		os.Exit(0)
	}

	// Get git info
	commitSHA := getGitCommitSHA()
	branch := getGitBranch()

	// Count results
	var passed, failed, skipped int
	for _, r := range results {
		switch r.Status {
		case "passed":
			passed++
		case "failed":
			failed++
		case "skipped":
			skipped++
		}
	}

	// Build test run
	run := TestRun{
		AgentID:    agentID,
		BeadID:     beadID,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		CommitSHA:  commitSHA,
		Branch:     branch,
		Command:    command,
		Total:      len(results),
		Passed:     passed,
		Failed:     failed,
		Skipped:    skipped,
		DurationMS: totalDuration,
		Results:    results,
	}

	if dryRun {
		// Print results without posting
		data, _ := json.MarshalIndent(run, "", "  ")
		fmt.Println(string(data))
		return
	}

	// POST to telemetry endpoint
	if err := postTestRun(endpoint, run); err != nil {
		fmt.Fprintf(os.Stderr, "error posting results: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Recorded %d tests (%d passed, %d failed, %d skipped) for agent %s\n",
		run.Total, run.Passed, run.Failed, run.Skipped, run.AgentID)
}

// parseGoTestJSON parses go test -json output from the given reader.
// Returns test results and total duration in milliseconds.
func parseGoTestJSON(r *os.File) ([]TestResult, int, error) {
	scanner := bufio.NewScanner(r)

	// Track test states: package/test -> events
	testStates := make(map[string]*testState)
	var totalDuration int

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var event TestEvent
		if err := json.Unmarshal(line, &event); err != nil {
			// Skip non-JSON lines (may be mixed output)
			continue
		}

		// Only process test-level events (not package-level)
		if event.Test == "" {
			continue
		}

		key := event.Package + "/" + event.Test
		state := testStates[key]
		if state == nil {
			state = &testState{
				pkg:  event.Package,
				name: event.Test,
			}
			testStates[key] = state
		}

		switch event.Action {
		case "run":
			state.started = event.Time
		case "pass":
			state.status = "passed"
			state.elapsed = event.Elapsed
		case "fail":
			state.status = "failed"
			state.elapsed = event.Elapsed
		case "skip":
			state.status = "skipped"
			state.elapsed = event.Elapsed
		case "output":
			// Capture output for error messages
			if state.status == "failed" || state.status == "" {
				state.output += event.Output
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, 0, fmt.Errorf("reading input: %w", err)
	}

	// Convert to TestResult slice
	var results []TestResult
	for _, state := range testStates {
		if state.status == "" {
			// Test didn't complete - might still be running or was interrupted
			continue
		}

		durationMS := int(state.elapsed * 1000)
		totalDuration += durationMS

		result := TestResult{
			TestFile:   state.pkg,
			TestName:   state.name,
			Status:     state.status,
			DurationMS: durationMS,
		}

		if state.status == "failed" && state.output != "" {
			result.ErrorMessage = strings.TrimSpace(state.output)
			// Truncate if too long
			if len(result.ErrorMessage) > 2000 {
				result.ErrorMessage = result.ErrorMessage[:2000] + "..."
			}
		}

		results = append(results, result)
	}

	return results, totalDuration, nil
}

// testState tracks the state of a single test during parsing.
type testState struct {
	pkg     string
	name    string
	started time.Time
	status  string
	elapsed float64
	output  string
}

// detectAgentID attempts to detect the agent ID from environment variables.
// This mirrors the gt CLI's identity detection logic.
func detectAgentID() string {
	role := os.Getenv("GT_ROLE")
	rig := os.Getenv("GT_RIG")

	// If GT_ROLE is already a full address
	if strings.Contains(role, "/") {
		return role
	}

	switch role {
	case "polecat":
		polecat := os.Getenv("GT_POLECAT")
		if rig != "" && polecat != "" {
			return fmt.Sprintf("%s/%s", rig, polecat)
		}
	case "crew":
		crew := os.Getenv("GT_CREW")
		if rig != "" && crew != "" {
			return fmt.Sprintf("%s/crew/%s", rig, crew)
		}
	case "witness":
		if rig != "" {
			return fmt.Sprintf("%s/witness", rig)
		}
	case "refinery":
		if rig != "" {
			return fmt.Sprintf("%s/refinery", rig)
		}
	}

	// Try to detect from current working directory
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}

	// Check for polecats directory pattern
	if strings.Contains(cwd, "/polecats/") {
		parts := strings.Split(cwd, "/polecats/")
		if len(parts) >= 2 {
			rigParts := strings.Split(parts[0], "/")
			rigName := rigParts[len(rigParts)-1]
			polecatName := strings.Split(parts[1], "/")[0]
			return fmt.Sprintf("%s/polecats/%s", rigName, polecatName)
		}
	}

	// Check for crew directory pattern
	if strings.Contains(cwd, "/crew/") {
		parts := strings.Split(cwd, "/crew/")
		if len(parts) >= 2 {
			rigParts := strings.Split(parts[0], "/")
			rigName := rigParts[len(rigParts)-1]
			crewName := strings.Split(parts[1], "/")[0]
			return fmt.Sprintf("%s/crew/%s", rigName, crewName)
		}
	}

	return ""
}

// getGitCommitSHA returns the current git commit SHA.
func getGitCommitSHA() string {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// getGitBranch returns the current git branch name.
func getGitBranch() string {
	cmd := exec.Command("git", "branch", "--show-current")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// postTestRun POSTs the test run to the telemetry endpoint.
func postTestRun(endpoint string, run TestRun) error {
	data, err := json.Marshal(run)
	if err != nil {
		return fmt.Errorf("marshaling request: %w", err)
	}

	resp, err := http.Post(endpoint, "application/json", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("posting request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %s", resp.Status)
	}

	return nil
}
