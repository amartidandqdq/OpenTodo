package httpapi

import "testing"

// resume-dossiers: the export carries the caller's dossiers, tombstones and
// ordered task references included, exactly like labels and places.
func TestExportIncludesDossiers(t *testing.T) {
	e := ownerEnv(t)
	e.syncOps("devA",
		rop("o1", "task", "t1", "title", "Get three quotes", 1),
		rop("o2", "task", "t2", "title", "Book the fitters", 1),
		rop("o3", "dossier", "d1", "title", "Kitchen", 1),
		rop("o4", "dossier", "d1", "note", "Two fitters", 1),
		rop("o5", "dossier", "d1", "task_ids", []string{"t1", "t2"}, 1),
		rop("o6", "dossier", "d1", "waiting", true, 1),
		rop("o7", "dossier", "d1", "waiting_for", "the quote", 1),
		rop("o8", "dossier", "d1", "follow_up", "2026-11-05", 1),
		rop("o9", "dossier", "d2", "title", "Old thread", 1),
		rop("o10", "dossier", "d2", "deleted_at", 5, 1),
	)
	resp, out := e.do("GET", "/api/v1/export", nil)
	e.mustStatus(resp, 200, out)
	list, ok := out["dossiers"].([]any)
	if !ok || len(list) != 2 {
		t.Fatalf("export dossiers = %v", out["dossiers"])
	}
	seenLive, seenDeleted := false, false
	for _, item := range list {
		d := item.(map[string]any)
		switch d["id"] {
		case "d1":
			seenLive = true
			ids, _ := d["task_ids"].([]any)
			if len(ids) != 2 || ids[0] != "t1" || ids[1] != "t2" || d["waiting"] != true || d["waiting_for"] != "the quote" || d["follow_up"] != "2026-11-05" {
				t.Fatalf("live dossier = %v", d)
			}
		case "d2":
			seenDeleted = true
			if d["deleted_at"] == nil {
				t.Fatalf("tombstone missing from export: %v", d)
			}
		}
	}
	if !seenLive || !seenDeleted {
		t.Fatalf("exported dossiers = %v", list)
	}
}
