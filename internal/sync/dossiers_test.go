package sync

import (
	"context"
	"slices"
	"testing"
)

func TestDossierFocusRejectsInvalidSelections(t *testing.T) {
	for _, value := range []string{`["a","b","c","d"]`, `["a","a"]`, `[""]`} {
		if err := Validate(op("focus", "review", "me", "focus_dossiers", value, 100, "A")); err == nil {
			t.Errorf("accepted invalid dossier focus %s", value)
		}
	}
	if err := Validate(op("focus-ok", "review", "me", "focus_dossiers", `["a","b","c"]`, 100, "A")); err != nil {
		t.Fatal(err)
	}
}

// Dossiers (OpenSpec change resume-dossiers): a personal thread of existing
// tasks, its order, its waiting state and the scope check on task_ids.

func TestDossierIsPersonalAndConvergesPerField(t *testing.T) {
	ctx := context.Background()
	s := newTestService(t)
	mustApply(t, s, "u1",
		op("a1", "task", "a", "title", `"Get three quotes"`, 100, "A"),
		op("b1", "task", "b", "title", `"Book the fitters"`, 100, "A"),
		op("d1", "dossier", "d", "title", `"Tyres"`, 100, "A"),
		op("d2", "dossier", "d", "task_ids", `["a","b"]`, 100, "A"),
		op("d3", "dossier", "d", "waiting_for", `"the delivery"`, 100, "A"),
		op("d4", "dossier", "d", "waiting", `true`, 100, "A"),
		op("d5", "dossier", "d", "follow_up", `"2026-11-02"`, 100, "A"),
		op("d6", "dossier", "d", "created_at", `100`, 100, "A"),
	)
	// A concurrent order loses as a whole; the other fields survive.
	mustApply(t, s, "u1", op("d7", "dossier", "d", "task_ids", `["b","a"]`, 90, "B"))
	e, err := s.Get(ctx, "u1", "dossier", "d")
	if err != nil || e == nil {
		t.Fatalf("dossier: %v %v", e, err)
	}
	if string(e["task_ids"]) != `["a","b"]` || string(e["waiting_for"]) != `"the delivery"` || string(e["follow_up"]) != `"2026-11-02"` {
		t.Fatalf("dossier = %v", e)
	}
	// Another account never sees it.
	if other, err := s.List(ctx, "u2", "dossier", true); err != nil || len(other) != 0 {
		t.Fatalf("u2 sees %d dossiers, %v", len(other), err)
	}
	if other, err := s.Get(ctx, "u2", "dossier", "d"); err != nil || other != nil {
		t.Fatalf("u2 reads dossier = %v, %v", other, err)
	}
}

func TestDossierTaskIDsUseVisibleTasksOnly(t *testing.T) {
	f := newSharing(t)
	f.add("alice", "bob", RoleEditor)
	// Bob may name a task of the shared project, and a task of his own Inbox.
	f.apply("bob", "B", f.op("task", "bob-inbox", "title", `"Bob private"`), f.op("task", "bob-inbox", "project_id", `null`))
	ok := f.op("dossier", "b1", "task_ids", `["t1","bob-inbox"]`)
	if res := f.apply("bob", "B", ok); res.Applied != 1 || len(res.Rejected) != 0 {
		t.Fatalf("visible ids = %+v", res)
	}
	// Alice's private Inbox task is not visible to Bob: refused, and the order stays.
	bad := f.op("dossier", "b1", "task_ids", `["t1","inbox"]`)
	if res := f.apply("bob", "B", bad); !slices.Equal(rejectedIDs(res), []string{bad.ID + ":" + ReasonForbidden}) {
		t.Fatalf("rejected = %v", rejectedIDs(res))
	}
	if got := f.field("bob", "dossier", "b1", "task_ids"); got != `["t1","bob-inbox"]` {
		t.Fatalf("order changed = %s", got)
	}
	// An id that names no task is refused too: the field is a reference, not free text.
	unknown := f.op("dossier", "b1", "task_ids", `["t1","bob-inbox","later"]`)
	if res := f.apply("bob", "B", unknown); !slices.Equal(rejectedIDs(res), []string{unknown.ID + ":" + ReasonForbidden}) {
		t.Fatalf("unknown id = %v", rejectedIDs(res))
	}
	// A task of a project Bob is not a member of is invisible even when the
	// project id is known (carol shares it with alice only).
	f.apply("carol", "C", f.op("project", "q", "name", `"Carol's"`), f.op("task", "q1", "title", `"Carol's task"`), f.op("task", "q1", "project_id", `"q"`))
	if _, err := f.s.AddMember(f.ctx, "carol", "q", "alice", RoleEditor); err != nil {
		t.Fatal(err)
	}
	foreignProject := f.op("dossier", "b1", "task_ids", `["t1","q1"]`)
	if res := f.apply("bob", "B", foreignProject); !slices.Equal(rejectedIDs(res), []string{foreignProject.ID + ":" + ReasonForbidden}) {
		t.Fatalf("foreign project task = %v", rejectedIDs(res))
	}
	// A device may attach a task it creates in the same batch (offline).
	forward := f.apply("bob", "B",
		f.op("dossier", "b2", "task_ids", `["new-task"]`),
		f.op("task", "new-task", "title", `"Offline task"`),
		f.op("task", "new-task", "project_id", `"p"`),
	)
	if forward.Applied != 3 || len(forward.Rejected) != 0 {
		t.Fatalf("same-batch task = %+v", forward)
	}
}

func TestDossierKeepsMembersAfterAccessLoss(t *testing.T) {
	f := newSharing(t)
	f.add("alice", "bob", RoleEditor)
	f.apply("bob", "B", f.op("task", "bob-inbox", "title", `"Bob private"`))
	f.apply("bob", "B", f.op("dossier", "b1", "task_ids", `["t1","bob-inbox"]`))
	if _, err := f.s.RemoveMember(f.ctx, "alice", "p", "bob"); err != nil {
		t.Fatal(err)
	}
	// The stored member stays; access loss never rewrites the order.
	if got := f.field("bob", "dossier", "b1", "task_ids"); got != `["t1","bob-inbox"]` {
		t.Fatalf("order after access loss = %s", got)
	}
	// Bob may reorder the remaining members, keeping the now-unavailable id.
	if res := f.apply("bob", "B", f.op("dossier", "b1", "task_ids", `["bob-inbox","t1"]`)); res.Applied != 1 || len(res.Rejected) != 0 {
		t.Fatalf("reorder with unavailable member = %+v", res)
	}
	// A different invisible task cannot be added: only the stored member is preserved.
	bad := f.op("dossier", "b1", "task_ids", `["bob-inbox","t1","t2"]`)
	res := f.apply("bob", "B", bad)
	if !slices.Equal(rejectedIDs(res), []string{bad.ID + ":" + ReasonForbidden}) {
		t.Fatalf("new invisible member = %v", rejectedIDs(res))
	}
	// The refusal hands back the stored order so the device can drop its list.
	restored := ""
	for _, restoredOp := range res.Restore {
		if restoredOp.Entity == "dossier" && restoredOp.EntityID == "b1" && restoredOp.Field == "task_ids" {
			restored = string(restoredOp.Value)
		}
	}
	if restored != `["bob-inbox","t1"]` {
		t.Fatalf("restored order = %q", restored)
	}
	// Removing the unavailable member explicitly is allowed.
	if res := f.apply("bob", "B", f.op("dossier", "b1", "task_ids", `["bob-inbox"]`)); res.Applied != 1 {
		t.Fatalf("remove unavailable member = %+v", res)
	}
	if got := f.field("alice", "dossier", "b1", "task_ids"); got != "<none>" {
		t.Fatalf("alice sees bob's dossier: %s", got)
	}
}

func TestDossierKeepsDeletedMembers(t *testing.T) {
	f := newSharing(t)
	f.apply("alice", "A", f.op("task", "gone", "title", `"Gone"`), f.op("dossier", "d1", "task_ids", `["gone"]`))
	f.apply("alice", "A", f.op("task", "gone", "deleted_at", `5`))
	// A deleted member is unavailable, not removed; another edit may keep it.
	if res := f.apply("alice", "A", f.op("dossier", "d1", "task_ids", `["gone"]`)); res.Applied != 1 {
		t.Fatalf("keep deleted member = %+v", res)
	}
	if got := f.field("alice", "dossier", "d1", "task_ids"); got != `["gone"]` {
		t.Fatalf("deleted member order = %s", got)
	}
}

func TestDossierWaitingNeverWritesTaskDue(t *testing.T) {
	f := newSharing(t)
	f.apply("alice", "A", f.op("task", "t1", "due", `{"date":"2026-11-02"}`))
	before := f.field("alice", "task", "t1", "due")
	f.apply("alice", "A",
		f.op("dossier", "d1", "title", `"Tyres"`),
		f.op("dossier", "d1", "task_ids", `["t1"]`),
		f.op("dossier", "d1", "waiting", `true`),
		f.op("dossier", "d1", "waiting_for", `"the delivery"`),
		f.op("dossier", "d1", "follow_up", `"2026-11-05"`),
	)
	if after := f.field("alice", "task", "t1", "due"); after != before {
		t.Fatalf("due changed: %s -> %s", before, after)
	}
	if got := f.field("alice", "dossier", "d1", "follow_up"); got != `"2026-11-05"` {
		t.Fatalf("follow_up = %s", got)
	}
	// Resuming writes only the dossier's three hold fields.
	f.apply("alice", "A",
		f.op("dossier", "d1", "waiting", `false`),
		f.op("dossier", "d1", "waiting_for", `""`),
		f.op("dossier", "d1", "follow_up", `null`),
	)
	if got := f.field("alice", "dossier", "d1", "waiting"); got != "false" {
		t.Fatalf("waiting = %s", got)
	}
	if after := f.field("alice", "task", "t1", "due"); after != before {
		t.Fatalf("due changed on resume: %s -> %s", before, after)
	}
}
