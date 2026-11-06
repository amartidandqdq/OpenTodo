package agenttools

import (
	"encoding/json"
	"strings"
	"testing"

	opsync "github.com/OpenTodoApp/opentodo/internal/sync"
)

// Dossier tools (OpenSpec change assistant-resume-dossiers): the Reprendre le
// fil threads are readable and writable, and never touch the member tasks.
func TestDossierTools(t *testing.T) {
	f := newFixture(t)
	c := agent("u1")
	f.task("u1", "t1", "Order the tyres", nil)
	f.task("u1", "t2", "Book the garage", nil)
	f.task("u1", "t3", "Alignment", map[string]any{"completed_at": 1})

	out := f.mustCall(c, "create_dossier", map[string]any{"title": "Tyres", "task_ids": []string{"t1", "t2", "t3"}, "follow_up": "2026-11-02"})
	res := out["results"].([]map[string]any)
	if res[0]["status"] != "created" {
		t.Fatalf("create = %v", out)
	}
	id := res[0]["id"].(string)
	d := f.entity("u1", "dossier", id)
	if str(d, "title") != "Tyres" || len(idListOf(d, "task_ids")) != 3 || str(d, "follow_up") != "2026-11-02" {
		t.Fatalf("dossier = %v", d)
	}
	if task := f.get("u1", "t1"); num(task, "completed_at") != 0 || rawStr(task, "project_id") != "" {
		t.Fatalf("a member task changed: %v", task)
	}

	list := f.mustCall(c, "list_dossiers", nil)["dossiers"].([]dossierOut)
	if len(list) != 1 || list[0].State != "active" || list[0].Total != 3 || list[0].Done != 1 || list[0].NextAction == nil || *list[0].NextAction != "t1" {
		t.Fatalf("list = %+v", list)
	}

	f.mustCall(c, "update_dossier", map[string]any{"id": id, "waiting": true, "waiting_for": "the delivery", "follow_up": nil})
	list = f.mustCall(c, "list_dossiers", nil)["dossiers"].([]dossierOut)
	if list[0].State != "waiting" || list[0].FollowUp != nil || list[0].Untrusted.WaitingFor != "the delivery" {
		t.Fatalf("waiting = %+v", list[0])
	}
	if out := f.mustCall(c, "update_dossier", map[string]any{"id": id, "waiting": true}); out["changed"] != 0 {
		t.Fatalf("same value changed: %v", out)
	}

	for name, args := range map[string]map[string]any{
		"unknown task":    {"id": id, "task_ids": []string{"nope"}},
		"unknown dossier": {"id": "nope", "title": "x"},
		"empty title":     {"id": id, "title": "  "},
		"bad date":        {"id": id, "follow_up": "2026-02-31"},
		"nothing":         {"id": id},
		"extra field":     {"id": id, "deleted_at": 5},
	} {
		if _, err := f.call(c, "update_dossier", args); err == nil {
			t.Fatalf("%s accepted", name)
		}
	}
	if _, err := f.call(c, "create_dossier", map[string]any{"title": "x", "task_ids": []string{"nope"}}); err == nil || !strings.Contains(err.Error(), "no such task") {
		t.Fatalf("create with unknown task: %v", err)
	}
}

// A never-written hold reads as its schema default, so a proposal's base matches
// what the device holds (a null base marked every hold change stale).
func TestDossierBaseUsesSchemaDefaults(t *testing.T) {
	d := withDossierDefaults(opsync.Entity{"id": json.RawMessage(`"d1"`), "waiting_for": json.RawMessage(`"x"`)})
	b := base(d, map[string]json.RawMessage{"waiting": nil, "waiting_for": nil, "follow_up": nil})
	if string(b["waiting"]) != "false" || string(b["waiting_for"]) != `"x"` || string(b["follow_up"]) != "null" {
		t.Fatalf("base = %s", b)
	}
	if string(withDossierDefaults(opsync.Entity{})["waiting_for"]) != `""` {
		t.Fatal("waiting_for default is not an empty string")
	}
}
