package importer

import (
	"context"
	"encoding/json"
	"testing"
)

// resume-dossiers: an own export restores personal dossiers and their order,
// waiting state and follow-up date; undo removes a dossier it created.
func TestRoundTripKeepsDossiers(t *testing.T) {
	h := newHarness(t)
	file := `{"format":"opentodo-export","version":1,"userId":"u1",
		"tasks":[
			{"id":"t1","title":"Get three quotes","project_id":null,"priority":4,"labels":[],"position":1,"created_at":1,"completed_at":null,"deleted_at":null},
			{"id":"t2","title":"Book the fitters","project_id":null,"priority":4,"labels":[],"position":2,"created_at":1,"completed_at":null,"deleted_at":null},
			{"id":"gone","title":"Old step","project_id":null,"priority":4,"labels":[],"position":3,"created_at":1,"completed_at":null,"deleted_at":1700000000000}],
		"dossiers":[{"id":"d1","title":"Kitchen","note":"Two fitters","task_ids":["t1","t2","gone"],
			"waiting":true,"waiting_for":"the quote","follow_up":"2026-11-05","workspace_id":null,
			"position":1,"created_at":1,"deleted_at":null}]}`
	plan, err := h.svc.Preview(context.Background(), h.uid, []byte(file), Options{})
	if err != nil {
		t.Fatal(err)
	}
	if plan.Totals.Dossiers != 1 || plan.Totals.Error != 0 {
		t.Fatalf("preview totals = %+v", plan.Totals)
	}
	job := h.run(file, Options{})
	if job.Status != StatusDone || job.Totals.Dossiers != 1 {
		t.Fatalf("job = %+v", job)
	}
	dossiers := h.list("dossier", true)
	if len(dossiers) != 1 {
		t.Fatalf("dossiers = %d", len(dossiers))
	}
	d := dossiers[0]
	if str(d, "title") != "Kitchen" || str(d, "note") != "Two fitters" || str(d, "waiting_for") != "the quote" || str(d, "follow_up") != "2026-11-05" || !boolValue(d, "waiting") {
		t.Fatalf("dossier = %v", d)
	}
	var ids []string
	if err := json.Unmarshal(d["task_ids"], &ids); err != nil || len(ids) != 3 || ids[0] != "t1" || ids[1] != "t2" || ids[2] != "gone" {
		t.Fatalf("order = %s, %v", d["task_ids"], err)
	}
	// The deleted member is restored as a tombstone, not silently dropped.
	gone, err := h.sync.Get(context.Background(), h.uid, "task", "gone")
	if err != nil || gone == nil || !gone.Deleted() {
		t.Fatalf("deleted member = %v, %v", gone, err)
	}
	// Undo tombstones the created dossier (and the tasks) like every other kind.
	if _, err := h.svc.Undo(context.Background(), h.uid, job.ID); err != nil {
		t.Fatal(err)
	}
	if live := h.list("dossier", false); len(live) != 0 {
		t.Fatalf("dossiers after undo = %d", len(live))
	}
}

// An own export can name a task already in the account, and a dossier that names
// no task at all is a row error rather than a write.
func TestImportDossierNeedsKnownTasks(t *testing.T) {
	h := newHarness(t)
	h.write("web", 1000, "task", "existing", map[string]any{"title": "Already here", "priority": 4})
	valid := `{"format":"opentodo-export","version":1,"userId":"u1",
		"dossiers":[{"id":"d-ok","title":"Existing","note":"","task_ids":["existing"],"waiting":false,"waiting_for":"","follow_up":null,"workspace_id":null,"position":1,"created_at":1,"deleted_at":null}]}`
	if job := h.run(valid, Options{}); job.Status != StatusDone || job.Totals.Dossiers != 1 {
		t.Fatalf("valid job = %+v", job)
	}
	if got := h.list("dossier", false); len(got) != 1 || string(got[0]["task_ids"]) != `["existing"]` {
		t.Fatalf("dossier = %v", got)
	}

	bad := `{"format":"opentodo-export","version":1,"userId":"u1",
		"tasks":[{"id":"t1","title":"A task","project_id":null,"priority":4,"labels":[],"position":1,"created_at":1,"completed_at":null,"deleted_at":null}],
		"dossiers":[{"id":"d-bad","title":"Broken","note":"","task_ids":["t1","ghost"],"waiting":false,"waiting_for":"","follow_up":null,"workspace_id":null,"position":1,"created_at":1,"deleted_at":null}]}`
	plan, err := h.svc.Preview(context.Background(), h.uid, []byte(bad), Options{})
	if err != nil {
		t.Fatal(err)
	}
	if plan.Totals.Error != 1 || plan.Totals.Dossiers != 0 {
		t.Fatalf("bad preview totals = %+v", plan.Totals)
	}
	if job := h.run(bad, Options{}); job.Status != StatusDone {
		t.Fatalf("bad job = %+v", job)
	}
	for _, d := range h.list("dossier", true) {
		if str(d, "id") == "d-bad" {
			t.Fatalf("invalid dossier was written: %v", d)
		}
	}
}

// A dossier follows the chosen import workspace like a label.
func TestDossierFollowsTheImportWorkspace(t *testing.T) {
	h := newHarness(t)
	work := h.workspace(h.uid, "Work")
	file := `{"format":"opentodo-export","version":1,"userId":"u1",
		"tasks":[{"id":"t1","title":"A step","project_id":null,"priority":4,"labels":[],"position":1,"created_at":1,"completed_at":null,"deleted_at":null}],
		"dossiers":[{"id":"d1","title":"Kitchen","note":"","task_ids":["t1"],"waiting":false,"waiting_for":"","follow_up":null,"workspace_id":"x-elsewhere","position":1,"created_at":1,"deleted_at":null}]}`
	if job := h.run(file, Options{Workspace: work}); job.Status != StatusDone {
		t.Fatalf("job = %+v", job)
	}
	dossiers := h.list("dossier", false)
	if len(dossiers) != 1 || string(dossiers[0]["workspace_id"]) != `"`+work+`"` {
		t.Fatalf("dossier workspace = %v", dossiers)
	}
}

func boolValue(e map[string]json.RawMessage, field string) bool {
	var b bool
	_ = json.Unmarshal(e[field], &b)
	return b
}
