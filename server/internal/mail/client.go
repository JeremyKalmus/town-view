// Package mail provides a client for interacting with the gt mail CLI.
package mail

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/gastown/townview/internal/types"
)

// Client wraps the gt mail CLI for mail operations.
type Client struct {
	townRoot string
	gtPath   string
}

// NewClient creates a new mail client.
func NewClient(townRoot string) *Client {
	gtPath := os.Getenv("GT_PATH")
	if gtPath == "" {
		gtPath = "gt"
	}
	return &Client{
		townRoot: townRoot,
		gtPath:   gtPath,
	}
}

// ListMailOptions configures mail listing.
type ListMailOptions struct {
	Limit      int
	Offset     int
	UnreadOnly bool
	Address    string // Optional: specific inbox address (e.g., "mayor/", "townview/witness")
}

// ListMail returns mail messages from an inbox.
func (c *Client) ListMail(rigPath string, opts ListMailOptions) ([]types.Mail, error) {
	args := []string{"mail", "inbox", "--json"}

	if opts.UnreadOnly {
		args = append(args, "--unread")
	}

	if opts.Address != "" {
		args = append(args, opts.Address)
	}

	output, err := c.runGT(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("gt mail inbox failed: %w", err)
	}

	// Handle null response (empty inbox)
	if string(bytes.TrimSpace(output)) == "null" {
		return []types.Mail{}, nil
	}

	var messages []types.Mail
	if err := json.Unmarshal(output, &messages); err != nil {
		return nil, fmt.Errorf("failed to parse mail: %w", err)
	}

	// Apply offset and limit
	if opts.Offset > 0 {
		if opts.Offset >= len(messages) {
			return []types.Mail{}, nil
		}
		messages = messages[opts.Offset:]
	}

	if opts.Limit > 0 && opts.Limit < len(messages) {
		messages = messages[:opts.Limit]
	}

	return messages, nil
}

// GetMail returns a single mail message by ID.
func (c *Client) GetMail(rigPath, mailID string) (*types.Mail, error) {
	args := []string{"mail", "read", mailID, "--json"}

	output, err := c.runGT(rigPath, args...)
	if err != nil {
		return nil, fmt.Errorf("gt mail read failed: %w", err)
	}

	var message types.Mail
	if err := json.Unmarshal(output, &message); err != nil {
		return nil, fmt.Errorf("failed to parse mail: %w", err)
	}

	return &message, nil
}

// runGT executes a gt command in the given rig path.
func (c *Client) runGT(rigPath string, args ...string) ([]byte, error) {
	cmd := exec.Command(c.gtPath, args...)
	if rigPath != "" {
		cmd.Dir = filepath.Join(c.townRoot, rigPath)
	} else {
		cmd.Dir = c.townRoot
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Debug("Running gt command", "args", args, "dir", cmd.Dir)

	if err := cmd.Run(); err != nil {
		slog.Error("gt command failed", "args", args, "stderr", stderr.String(), "error", err)
		return nil, fmt.Errorf("%s: %s", err, stderr.String())
	}

	return stdout.Bytes(), nil
}
