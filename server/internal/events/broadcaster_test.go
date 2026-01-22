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

	client := make(Client, 10)
	b.Register(client)

	// Give time for registration
	time.Sleep(10 * time.Millisecond)

	b.mu.RLock()
	if !b.clients[client] {
		t.Error("client not registered")
	}
	b.mu.RUnlock()

	b.Unregister(client)

	// Give time for unregistration
	time.Sleep(10 * time.Millisecond)

	b.mu.RLock()
	if b.clients[client] {
		t.Error("client still registered after unregister")
	}
	b.mu.RUnlock()
}

func TestBroadcasterBroadcast(t *testing.T) {
	b := NewBroadcaster()
	go b.Run()

	client1 := make(Client, 10)
	client2 := make(Client, 10)
	b.Register(client1)
	b.Register(client2)

	// Give time for registration
	time.Sleep(10 * time.Millisecond)

	testMsg := map[string]string{"type": "test", "data": "hello"}
	b.Broadcast(testMsg)

	// Check both clients receive the message
	select {
	case msg := <-client1:
		if len(msg) == 0 {
			t.Error("client1 received empty message")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("client1 did not receive message")
	}

	select {
	case msg := <-client2:
		if len(msg) == 0 {
			t.Error("client2 received empty message")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("client2 did not receive message")
	}
}

func TestBroadcasterClientDisconnect(t *testing.T) {
	b := NewBroadcaster()
	go b.Run()

	client := make(Client, 10)
	b.Register(client)

	// Give time for registration
	time.Sleep(10 * time.Millisecond)

	b.Unregister(client)

	// Give time for unregistration
	time.Sleep(10 * time.Millisecond)

	// Verify channel is closed
	_, ok := <-client
	if ok {
		t.Error("client channel should be closed after unregister")
	}
}
