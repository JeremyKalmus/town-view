// Package watcher provides file system watching for real-time updates.
package watcher

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gastown/townview/internal/types"
	"github.com/gastown/townview/internal/ws"
)

// pendingEvent tracks a pending file change event.
type pendingEvent struct {
	lastMod time.Time
	isMail  bool
}

// Watcher monitors .beads directories for changes.
type Watcher struct {
	townRoot   string
	wsHub      *ws.Hub
	watcher    *fsnotify.Watcher
	debounce   time.Duration
	pending    map[string]*pendingEvent
	mu         sync.Mutex
	stopCh     chan struct{}
}

// New creates a new file watcher.
func New(townRoot string, wsHub *ws.Hub) *Watcher {
	debounce := 100 * time.Millisecond
	if d := os.Getenv("WATCH_DEBOUNCE_MS"); d != "" {
		if ms, err := time.ParseDuration(d + "ms"); err == nil {
			debounce = ms
		}
	}

	return &Watcher{
		townRoot: townRoot,
		wsHub:    wsHub,
		debounce: debounce,
		pending:  make(map[string]*pendingEvent),
		stopCh:   make(chan struct{}),
	}
}

// Start begins watching .beads directories.
func (w *Watcher) Start() error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	w.watcher = watcher

	// Find and watch all .beads directories
	beadsDirs := w.findBeadsDirs()
	for _, dir := range beadsDirs {
		if err := watcher.Add(dir); err != nil {
			slog.Warn("Failed to watch directory", "dir", dir, "error", err)
		} else {
			slog.Info("Watching directory", "dir", dir)
		}
	}

	// Start event loop
	go w.run()

	// Start debounce processor
	go w.processDebounced()

	return nil
}

// Stop stops the file watcher.
func (w *Watcher) Stop() {
	close(w.stopCh)
	if w.watcher != nil {
		w.watcher.Close()
	}
}

// findBeadsDirs finds all .beads directories in the town.
func (w *Watcher) findBeadsDirs() []string {
	var dirs []string

	// Town-level beads
	townBeads := filepath.Join(w.townRoot, ".beads")
	if _, err := os.Stat(townBeads); err == nil {
		dirs = append(dirs, townBeads)
	}

	// Scan for rig-level beads
	entries, err := os.ReadDir(w.townRoot)
	if err != nil {
		return dirs
	}

	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		rigBeads := filepath.Join(w.townRoot, entry.Name(), ".beads")
		if _, err := os.Stat(rigBeads); err == nil {
			dirs = append(dirs, rigBeads)
		}
	}

	return dirs
}

// run is the main event loop.
func (w *Watcher) run() {
	for {
		select {
		case <-w.stopCh:
			return

		case event, ok := <-w.watcher.Events:
			if !ok {
				return
			}
			w.handleEvent(event)

		case err, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
			slog.Error("File watcher error", "error", err)
		}
	}
}

// handleEvent processes a file system event.
func (w *Watcher) handleEvent(event fsnotify.Event) {
	// Only care about writes
	if event.Op&fsnotify.Write == 0 && event.Op&fsnotify.Create == 0 {
		return
	}

	// Only watch specific files
	filename := filepath.Base(event.Name)
	if !strings.HasSuffix(filename, ".jsonl") && !strings.HasSuffix(filename, ".db") {
		return
	}

	// Track if this is a mail-related change for specific event broadcast
	isMail := strings.Contains(filename, "mail") || strings.Contains(event.Name, "mail")

	// Debounce
	w.mu.Lock()
	w.pending[event.Name] = &pendingEvent{
		lastMod: time.Now(),
		isMail:  isMail,
	}
	w.mu.Unlock()
}

// processDebounced processes debounced events.
func (w *Watcher) processDebounced() {
	ticker := time.NewTicker(w.debounce)
	defer ticker.Stop()

	for {
		select {
		case <-w.stopCh:
			return

		case <-ticker.C:
			w.flushPending()
		}
	}
}

// flushPending broadcasts changes for files that haven't been modified recently.
func (w *Watcher) flushPending() {
	w.mu.Lock()
	defer w.mu.Unlock()

	now := time.Now()
	for path, event := range w.pending {
		if now.Sub(event.lastMod) < w.debounce {
			continue
		}

		// Determine rig from path
		rig := w.rigFromPath(path)

		// Broadcast beads_changed event
		w.wsHub.Broadcast(types.WSMessage{
			Type: "beads_changed",
			Rig:  rig,
			Payload: map[string]string{
				"file": filepath.Base(path),
			},
		})

		// Also broadcast mail_received if this is a mail-related change
		if event.isMail {
			w.wsHub.Broadcast(types.WSMessage{
				Type: "mail_received",
				Rig:  rig,
				Payload: map[string]string{
					"file": filepath.Base(path),
				},
			})
			slog.Debug("Broadcast mail received", "rig", rig, "file", path)
		}

		delete(w.pending, path)
		slog.Debug("Broadcast beads change", "rig", rig, "file", path)
	}
}

// rigFromPath extracts rig name from a .beads path.
func (w *Watcher) rigFromPath(path string) string {
	rel, err := filepath.Rel(w.townRoot, path)
	if err != nil {
		return "unknown"
	}

	parts := strings.Split(rel, string(filepath.Separator))
	if len(parts) > 0 {
		if parts[0] == ".beads" {
			return "hq"
		}
		return parts[0]
	}
	return "unknown"
}
