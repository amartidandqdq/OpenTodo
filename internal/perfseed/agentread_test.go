package perfseed

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/OpenTodoApp/opentodo/internal/agenttools"
	"github.com/OpenTodoApp/opentodo/internal/store"
	opsync "github.com/OpenTodoApp/opentodo/internal/sync"
)

// TestAgentTaskReadStatements: an agent's task read, with when each task last
// changed (OpenSpec change simple-mode, design D6), runs no more statements on
// the 10,000-task account than on an account with one task in a shared project, and says changed_at.
func TestAgentTaskReadStatements(t *testing.T) {
	dir, s := build(t)
	read := func(svc *opsync.Service, log *queryLog, user string) (int, string) {
		reg := agenttools.New(svc, agenttools.Options{Now: func() time.Time { return fixedNow }})
		c := agenttools.Caller{UserID: user, Scope: agenttools.ScopeAgent}
		log.reset()
		out, err := reg.Call(context.Background(), c, "search_tasks", json.RawMessage(`{"query":"a"}`))
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := json.Marshal(out)
		return log.count(), string(raw)
	}
	bigSvc, bigLog := counting(t, filepath.Join(dir, "opentodo.db"))
	big, bigOut := read(bigSvc, bigLog, s.OwnerID)

	small := t.TempDir()
	db, err := store.Open(small)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO users(id,email,name,password_hash,created_at) VALUES('u','u@example.com','u','h',1)`); err != nil {
		t.Fatal(err)
	}
	ops := []opsync.Op{
		{ID: "o0", Entity: "project", EntityID: "p", Field: "name", Value: json.RawMessage(`"P"`), TS: 1, Device: "d"},
		{ID: "o1", Entity: "task", EntityID: "t", Field: "title", Value: json.RawMessage(`"a task"`), TS: 1, Device: "d"},
		{ID: "o2", Entity: "task", EntityID: "t", Field: "project_id", Value: json.RawMessage(`"p"`), TS: 1, Device: "d"},
	}
	svc := opsync.NewService(db)
	if _, err := svc.Apply(context.Background(), "u", ops); err != nil {
		t.Fatal(err)
	}
	// Shared like the fixture's projects, so both run the shared-scope reads.
	if _, err := db.Exec(`INSERT INTO users(id,email,name,password_hash,created_at) VALUES('v','v@example.com','v','h',1)`); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.AddMember(context.Background(), "u", "p", "v", opsync.RoleEditor); err != nil {
		t.Fatal(err)
	}
	db.Close()
	smallSvc, smallLog := counting(t, filepath.Join(small, "opentodo.db"))
	few, _ := read(smallSvc, smallLog, "u")
	t.Logf("statements of one agent task read: %d at %d tasks, %d at 1", big, Tasks, few)
	if big > few {
		t.Fatalf("an agent task read ran %d statements at %d tasks, %d at one shared task: the cost grows with the account", big, Tasks, few)
	}
	if !strings.Contains(bigOut, `"changed_at"`) {
		t.Fatal("the read says no changed_at")
	}
}
