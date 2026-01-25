package main

import (
	"os"
	"strings"
	"testing"
)

func TestParseGoTestJSON(t *testing.T) {
	// Sample go test -json output
	input := `{"Time":"2025-01-24T12:00:00Z","Action":"run","Package":"example/pkg","Test":"TestFoo"}
{"Time":"2025-01-24T12:00:01Z","Action":"pass","Package":"example/pkg","Test":"TestFoo","Elapsed":0.5}
{"Time":"2025-01-24T12:00:01Z","Action":"run","Package":"example/pkg","Test":"TestBar"}
{"Time":"2025-01-24T12:00:02Z","Action":"fail","Package":"example/pkg","Test":"TestBar","Elapsed":1.0}
{"Time":"2025-01-24T12:00:02Z","Action":"output","Package":"example/pkg","Test":"TestBar","Output":"    error: assertion failed\n"}
{"Time":"2025-01-24T12:00:02Z","Action":"run","Package":"example/pkg","Test":"TestSkipped"}
{"Time":"2025-01-24T12:00:02Z","Action":"skip","Package":"example/pkg","Test":"TestSkipped","Elapsed":0.0}
`
	// Create temp file with input
	tmpFile, err := os.CreateTemp("", "test-*.json")
	if err != nil {
		t.Fatalf("creating temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.WriteString(input); err != nil {
		t.Fatalf("writing temp file: %v", err)
	}
	tmpFile.Seek(0, 0)

	results, totalDuration, err := parseGoTestJSON(tmpFile)
	if err != nil {
		t.Fatalf("parseGoTestJSON: %v", err)
	}

	if len(results) != 3 {
		t.Errorf("expected 3 results, got %d", len(results))
	}

	// Check we have expected statuses
	statusCounts := make(map[string]int)
	for _, r := range results {
		statusCounts[r.Status]++
	}

	if statusCounts["passed"] != 1 {
		t.Errorf("expected 1 passed, got %d", statusCounts["passed"])
	}
	if statusCounts["failed"] != 1 {
		t.Errorf("expected 1 failed, got %d", statusCounts["failed"])
	}
	if statusCounts["skipped"] != 1 {
		t.Errorf("expected 1 skipped, got %d", statusCounts["skipped"])
	}

	// Check total duration is reasonable (1500ms expected)
	if totalDuration < 1000 || totalDuration > 2000 {
		t.Errorf("unexpected total duration: %d ms", totalDuration)
	}

	// Check error message captured for failed test
	for _, r := range results {
		if r.Status == "failed" {
			if !strings.Contains(r.ErrorMessage, "assertion failed") {
				t.Errorf("expected error message to contain 'assertion failed', got: %s", r.ErrorMessage)
			}
		}
	}
}

func TestDetectAgentID(t *testing.T) {
	// Clear any existing environment
	origRole := os.Getenv("GT_ROLE")
	origRig := os.Getenv("GT_RIG")
	origPolecat := os.Getenv("GT_POLECAT")
	origCrew := os.Getenv("GT_CREW")
	defer func() {
		os.Setenv("GT_ROLE", origRole)
		os.Setenv("GT_RIG", origRig)
		os.Setenv("GT_POLECAT", origPolecat)
		os.Setenv("GT_CREW", origCrew)
	}()

	tests := []struct {
		name     string
		role     string
		rig      string
		polecat  string
		crew     string
		expected string
	}{
		{
			name:     "full address in GT_ROLE",
			role:     "townview/crew/jeremy",
			expected: "townview/crew/jeremy",
		},
		{
			name:     "polecat with env vars",
			role:     "polecat",
			rig:      "townview",
			polecat:  "obsidian",
			expected: "townview/obsidian",
		},
		{
			name:     "crew with env vars",
			role:     "crew",
			rig:      "townview",
			crew:     "jeremy",
			expected: "townview/crew/jeremy",
		},
		{
			name:     "witness",
			role:     "witness",
			rig:      "townview",
			expected: "townview/witness",
		},
		{
			name:     "refinery",
			role:     "refinery",
			rig:      "townview",
			expected: "townview/refinery",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			os.Setenv("GT_ROLE", tc.role)
			os.Setenv("GT_RIG", tc.rig)
			os.Setenv("GT_POLECAT", tc.polecat)
			os.Setenv("GT_CREW", tc.crew)

			result := detectAgentID()
			if result != tc.expected {
				t.Errorf("detectAgentID() = %q, want %q", result, tc.expected)
			}
		})
	}
}
