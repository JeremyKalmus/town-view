// Package main is the entry point for Town View server.
package main

import (
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gastown/townview/internal/events"
	"github.com/gastown/townview/internal/handlers"
	"github.com/gastown/townview/internal/mail"
	"github.com/gastown/townview/internal/registry"
	"github.com/gastown/townview/internal/rigmanager"
	"github.com/gastown/townview/internal/telemetry"
)

func main() {
	// Parse flags
	port := flag.Int("port", 8080, "HTTP server port")
	townRoot := flag.String("town", "", "Gas Town root directory (default: ~/gt)")
	logLevel := flag.String("log-level", "info", "Log level (debug, info, warn, error)")
	flag.Parse()

	// Set up logging
	level := slog.LevelInfo
	switch *logLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
	slog.SetDefault(logger)

	// Determine town root
	root := *townRoot
	if root == "" {
		root = os.Getenv("TOWN_ROOT")
	}
	if root == "" {
		home, _ := os.UserHomeDir()
		root = filepath.Join(home, "gt")
	}

	// Verify town root exists
	if _, err := os.Stat(root); os.IsNotExist(err) {
		slog.Error("Town root directory not found", "path", root)
		os.Exit(1)
	}
	slog.Info("Starting Town View", "town_root", root, "port", *port)

	// Initialize Service Layer components

	// Event Store - central event collection (in-memory for now)
	eventStore, err := events.NewStore(events.DefaultConfig())
	if err != nil {
		slog.Error("Failed to create EventStore", "error", err)
		os.Exit(1)
	}
	defer eventStore.Close()

	// Agent Registry - tracks all agent states
	agentRegistry := registry.NewWithDefaults()
	agentRegistry.Start()
	defer agentRegistry.Stop()

	// Rig Manager - discovers rigs and manages Query Services
	rigMgr, err := rigmanager.New(rigmanager.Config{
		TownRoot: root,
	}, eventStore, agentRegistry)
	if err != nil {
		slog.Error("Failed to create RigManager", "error", err)
		os.Exit(1)
	}
	defer rigMgr.Close()

	// Mail client - still uses CLI (no replacement yet)
	mailClient := mail.NewClient(root)

	// Telemetry Collector - tracks test results, token usage, git changes
	telemetryDBPath := filepath.Join(root, "telemetry.db")
	telemetryCollector, err := telemetry.NewSQLiteCollector(telemetryDBPath)
	if err != nil {
		slog.Warn("Failed to create telemetry collector, telemetry endpoints will be disabled", "error", err)
	}
	if telemetryCollector != nil {
		defer telemetryCollector.Close()
	}

	// Set up HTTP handlers with Service Layer
	h := handlers.New(rigMgr, eventStore, agentRegistry, mailClient, telemetryCollector, root)
	wsHandler := handlers.NewWebSocketHandler(rigMgr, eventStore, agentRegistry, mailClient)

	// Start WebSocket hub
	go wsHandler.Hub().Run()

	// Routes
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("GET /api/rigs", h.ListRigs)
	mux.HandleFunc("GET /api/rigs/{rigId}", h.GetRig)
	mux.HandleFunc("GET /api/rigs/{rigId}/issues", h.ListIssues)
	mux.HandleFunc("GET /api/rigs/{rigId}/issues/{issueId}", h.GetIssue)
	mux.HandleFunc("PATCH /api/rigs/{rigId}/issues/{issueId}", h.UpdateIssue)
	mux.HandleFunc("GET /api/rigs/{rigId}/issues/{issueId}/dependencies", h.GetIssueDependencies)
	mux.HandleFunc("POST /api/rigs/{rigId}/issues/{issueId}/dependencies", h.AddIssueDependency)
	mux.HandleFunc("DELETE /api/rigs/{rigId}/issues/{issueId}/dependencies/{blockerId}", h.RemoveIssueDependency)
	mux.HandleFunc("GET /api/rigs/{rigId}/agents", h.ListAgents)
	mux.HandleFunc("GET /api/rigs/{rigId}/agents/{agentId}/peek", h.PeekAgent)
	mux.HandleFunc("GET /api/rigs/{rigId}/agents/{agentId}/mail", h.GetAgentMail)
	mux.HandleFunc("GET /api/mail/{mailId}", h.GetMailMessage)
	mux.HandleFunc("GET /api/rigs/{rigId}/dependencies", h.ListDependencies)
	mux.HandleFunc("GET /api/rigs/{rigId}/issues/{issueId}/progress", h.GetMoleculeProgress)
	mux.HandleFunc("GET /api/rigs/{rigId}/activity", h.GetRecentActivity)
	mux.HandleFunc("GET /api/rigs/{rigId}/mail", h.ListRigMail)

	// Mail (town-level)
	mux.HandleFunc("GET /api/mail", h.ListMail)

	// Telemetry (test suite status)
	mux.HandleFunc("GET /api/telemetry/tests", h.GetTestSuiteStatus)
	mux.HandleFunc("POST /api/telemetry/tests", h.CreateTestRun)
	mux.HandleFunc("GET /api/telemetry/regressions", h.GetRegressions)

	// WebSocket (real-time data streaming)
	mux.Handle("GET /ws", wsHandler)

	// Static files (frontend build)
	mux.Handle("/", http.FileServer(http.Dir("./static")))

	// CORS middleware for development
	handler := corsMiddleware(mux)

	// Start server
	addr := fmt.Sprintf(":%d", *port)
	slog.Info("Server listening", "addr", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}

// corsMiddleware adds CORS headers for development.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
