// Package mail provides a client for interacting with the gt mail CLI.
package mail

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"strconv"

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

// ListMailOptions contains options for listing mail.
type ListMailOptions struct {
	Address    string // Mailbox address (e.g., "mayor/", "gastown/Toast")
	Limit      int    // Max messages to return (0 = default 50)
	Offset     int    // Number of messages to skip
	UnreadOnly bool   // Only return unread messages
}

// ListMail returns mail messages for the given mailbox.
func (c *Client) ListMail(opts ListMailOptions) ([]types.Mail, error) {
	args := []string{"mail", "inbox"}

	// Add address if specified
	if opts.Address != "" {
		args = append(args, opts.Address)
	}

	// Add flags
	args = append(args, "--json")
	if opts.UnreadOnly {
		args = append(args, "--unread")
	}

	output, err := c.runGT(args...)
	if err != nil {
		return nil, fmt.Errorf("gt mail inbox failed: %w", err)
	}

	// Handle empty/null response
	if len(output) == 0 || string(output) == "null\n" || string(output) == "null" {
		return []types.Mail{}, nil
	}

	var messages []types.Mail
	if err := json.Unmarshal(output, &messages); err != nil {
		return nil, fmt.Errorf("failed to parse mail: %w", err)
	}

	// Apply limit and offset (gt mail inbox doesn't support these natively)
	if opts.Offset > 0 && opts.Offset < len(messages) {
		messages = messages[opts.Offset:]
	} else if opts.Offset >= len(messages) {
		return []types.Mail{}, nil
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 50 // default limit
	}
	if limit < len(messages) {
		messages = messages[:limit]
	}

	return messages, nil
}

// ListRigMail returns mail messages for a specific rig.
func (c *Client) ListRigMail(rigPath string, opts ListMailOptions) ([]types.Mail, error) {
	// For rig-specific mail, we query the rig's mailbox
	// The address format for a rig is "rigname/"
	if opts.Address == "" {
		// Extract rig name from path (e.g., "townview" from "townview/polecats/rictus")
		opts.Address = rigPath + "/"
	}

	return c.ListMail(opts)
}

// runGT executes a gt command.
func (c *Client) runGT(args ...string) ([]byte, error) {
	cmd := exec.Command(c.gtPath, args...)
	cmd.Dir = c.townRoot
	cmd.Env = append(os.Environ(), fmt.Sprintf("TOWN_ROOT=%s", c.townRoot))

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

// ParseQueryParams extracts ListMailOptions from query parameters.
func ParseQueryParams(getParam func(string) string) ListMailOptions {
	opts := ListMailOptions{}

	if limit := getParam("limit"); limit != "" {
		if n, err := strconv.Atoi(limit); err == nil && n > 0 {
			opts.Limit = n
		}
	}

	if offset := getParam("offset"); offset != "" {
		if n, err := strconv.Atoi(offset); err == nil && n >= 0 {
			opts.Offset = n
		}
	}

	if unread := getParam("unread_only"); unread == "true" {
		opts.UnreadOnly = true
	}

	return opts
}
