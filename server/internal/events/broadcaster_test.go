package events

import (
	"testing"
	"time"
)

func TestNewBroadcaster(t *testing.T) {
	b := NewBroadcaster()
	if b == nil {
		t.Fatal("NewBroadcaster returned nil")
	}
	if b.clients == nil {
		t.Error("clients map not initialized")
	}
	if b.broadcast == nil {
		t.Error("broadcast channel not initialized")
	}
	if b.register == nil {
		t.Error("register channel not initialized")
	}
	if b.unregister == nil {
		t.Error("unregister channel not initialized")
	}
}

func TestBroadcasterRegisterUnregister(t *testing.T) {
	b := NewBroadcaster()
	go b.Run()

	ch := b.Register()

	// Give time for registration
	time.Sleep(10 * time.Millisecond)

	b.mu.RLock()
	if len(b.clients) != 1 {
		t.Errorf("expected 1 client, got %d", len(b.clients))
	}
	b.mu.RUnlock()

	b.Unregister(ch)

	// Give time for unregistration
	time.Sleep(10 * time.Millisecond)

	b.mu.RLock()
	if len(b.clients) != 0 {
		t.Errorf("expected 0 clients after unregister, got %d", len(b.clients))
	}
	b.mu.RUnlock()
}

func TestBroadcasterBroadcast(t *testing.T) {
	b := NewBroadcaster()
	go b.Run()

	ch1 := b.Register()
	ch2 := b.Register()

	// Give time for registration
	time.Sleep(10 * time.Millisecond)

	testMsg := map[string]string{"type": "test", "data": "hello"}
	b.Broadcast(testMsg)

	// Check both clients receive the message
	select {
	case msg := <-ch1:
		if msg == nil {
			t.Error("client1 received nil message")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("client1 did not receive message")
	}

	select {
	case msg := <-ch2:
		if msg == nil {
			t.Error("client2 received nil message")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("client2 did not receive message")
	}
}

func TestBroadcasterClientDisconnect(t *testing.T) {
	b := NewBroadcaster()
	go b.Run()

	ch := b.Register()

	// Give time for registration
	time.Sleep(10 * time.Millisecond)

	b.Unregister(ch)

	// Give time for unregistration
	time.Sleep(10 * time.Millisecond)

	// Verify channel is closed
	_, ok := <-ch
	if ok {
		t.Error("client channel should be closed after unregister")
	}
}
