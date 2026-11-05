package agenttools

import (
	"context"
	"encoding/json"
	"slices"
	"strings"
	"testing"
	"time"
)

// assistant-skills 1.1: the catalogue matches the spec and stays inside the registry.
func TestSkillCatalogue(t *testing.T) {
	want := []string{"idea-to-project", "plan-week", "weekly-review", "triage-inbox", "break-down", "capture", "plan-day", "tidy-up"}
	var ids []string
	seen := map[string]bool{}
	c := Caller{Scope: ScopeAgent, OwnerAllowsWrites: true, UserAllowsWrites: true}
	for _, s := range Skills {
		if seen[s.ID] {
			t.Fatalf("duplicate skill id %q", s.ID)
		}
		seen[s.ID] = true
		ids = append(ids, s.ID)
		if s.Name == "" || s.Description == "" || s.Example == "" || strings.TrimSpace(s.Instructions) == "" || len(s.Tools) == 0 {
			t.Fatalf("%s: incomplete definition", s.ID)
		}
		if s.Result != ResultChanges && s.Result != ResultAnswer {
			t.Fatalf("%s: result %q", s.ID, s.Result)
		}
		for _, name := range s.Tools {
			_, d, ok := lookup(name, c)
			if !ok {
				t.Fatalf("%s: tool %q is not in the registry", s.ID, name)
			}
			if s.Result == ResultAnswer && d.Kind != KindRead {
				t.Fatalf("%s: answer skill lists write tool %q", s.ID, name)
			}
		}
		if got, ok := SkillByID(s.ID); !ok || got.Name != s.Name {
			t.Fatalf("SkillByID(%q)", s.ID)
		}
	}
	if !slices.Equal(ids, want) {
		t.Fatalf("skill ids = %v, want %v", ids, want)
	}
	if _, ok := SkillByID("export-everything"); ok {
		t.Fatal("unknown id found")
	}
	// The weekly review never gains a tool the design does not list.
	wr, _ := SkillByID("weekly-review")
	if wr.Allows("add_comment") || wr.Allows("create_project") || !wr.Allows("schedule_tasks") {
		t.Fatalf("weekly-review tools = %v", wr.Tools)
	}
	// capture (voice-ramble D7) proposes changes but never trashes.
	cp, _ := SkillByID("capture")
	if cp.Allows("trash_tasks") || !cp.Allows("create_tasks") || !cp.Allows("search_tasks") || !cp.Allows("create_project") || cp.Result != ResultChanges {
		t.Fatalf("capture tools = %v", cp.Tools)
	}
	// plan-day and tidy-up (simple-mode D6) only schedule, update or complete; never trash, create or move.
	for _, id := range []string{"plan-day", "tidy-up"} {
		sk, _ := SkillByID(id)
		if sk.Result != ResultChanges || sk.Allows("trash_tasks") || sk.Allows("create_tasks") || sk.Allows("move_tasks") || !sk.Allows("today_summary") {
			t.Fatalf("%s tools = %v", id, sk.Tools)
		}
	}
	if pd, _ := SkillByID("plan-day"); pd.Allows("complete_tasks") || pd.Allows("update_tasks") || !strings.Contains(pd.Instructions, "today_limit") {
		t.Fatalf("plan-day = %v", pd.Tools)
	}
	if td, _ := SkillByID("tidy-up"); !strings.Contains(td.Instructions, "changed_at") || !strings.Contains(td.Instructions, "Never trash") {
		t.Fatal("tidy-up instructions lost their limits")
	}
	if cp, _ := SkillByID("capture"); !strings.Contains(cp.Instructions, "filed with") {
		t.Fatal("capture does not file items by their project's tasks")
	}
	if n := WorkdayNote(9, 17, 420); !strings.Contains(n, "09:00") || !strings.Contains(n, "17:00") || !strings.Contains(n, "420 minutes") {
		t.Fatalf("workday note = %q", n)
	}
}

// A subtask named only by its parent goes in the parent's project (assistant-skills 5.2).
func TestCreateSubtaskInheritsParentProject(t *testing.T) {
	f := newFixture(t)
	f.put("u1", "project", "p1", map[string]any{"name": "Work"})
	f.put("u1", "task", "t1", map[string]any{"title": "Plan the offsite", "project_id": "p1"})
	plan, err := f.reg.Plan(context.Background(), agent("u1"), "create_tasks", json.RawMessage(`{"items":[{"title":"Book the venue","parent_id":"t1","estimate_minutes":30}]}`), nil)
	if err != nil {
		t.Fatal(err)
	}
	if got := string(plan.Changes[0].Patch["project_id"]); got != `"p1"` {
		t.Fatalf("project_id = %s, want the parent's", got)
	}
}

// simple-mode D6: a task's view says when it last changed (tidy-up's stale tasks).
func TestTaskViewChangedAt(t *testing.T) {
	f := newFixture(t)
	f.task("u1", "t1", "Install the second kitchen shelf", nil)
	first := f.ts
	got := f.mustCall(agent("u1"), "get_task", map[string]any{"id": "t1"})
	raw, _ := json.Marshal(got)
	if want := time.UnixMilli(first).UTC().Format(time.RFC3339); !strings.Contains(string(raw), `"changed_at":"`+want+`"`) {
		t.Fatalf("changed_at missing or wrong (want %s): %s", want, raw)
	}
	f.ts += 30_000
	f.put("u1", "task", "t1", map[string]any{"priority": 1})
	got = f.mustCall(agent("u1"), "list_tasks", map[string]any{"view": "inbox"})
	raw, _ = json.Marshal(got)
	if want := time.UnixMilli(f.ts).UTC().Format(time.RFC3339); !strings.Contains(string(raw), `"changed_at":"`+want+`"`) {
		t.Fatalf("changed_at did not follow the edit (want %s): %s", want, raw)
	}
}
