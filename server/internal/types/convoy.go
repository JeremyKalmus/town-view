// Package types defines shared data types for Town View.
package types

// ConvoyInfo contains convoy context for enriched issue responses.
type ConvoyInfo struct {
	ID       string         `json:"id"`
	Title    string         `json:"title"`
	Progress ConvoyProgress `json:"progress"`
}

// ConvoyProgress tracks completion progress of a convoy.
type ConvoyProgress struct {
	Completed  int     `json:"completed"`
	Total      int     `json:"total"`
	Percentage float64 `json:"percentage"`
}
