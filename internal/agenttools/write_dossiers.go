package agenttools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	opsync "github.com/OpenTodoApp/opentodo/internal/sync"
)

// ---- dossiers (OpenSpec change assistant-resume-dossiers) ----
//
// A dossier is the personal, ordered thread of existing tasks behind the
// "Reprendre le fil" page. The tools only read and plan the dossier's own
// fields (title, note, order, waiting, follow-up); a dossier never moves a task
// or changes its list, due date or completion.

const maxDossierSteps = 50

var (
	dossierTaskIDsProp = map[string]any{"type": "array", "maxItems": maxDossierSteps, "items": map[string]any{"type": "string"},
		"description": fmt.Sprintf("The dossier's steps: ids of existing tasks (see list_tasks), in order, at most %d. The current step is the first open one. Attaching a task never moves it or changes its list, due date or completion.", maxDossierSteps)}
	dossierWaitingProp  = map[string]any{"type": "boolean", "description": "true puts the whole thread on hold (the \"En attente\" view); it never changes a task's due date."}
	dossierWaitingFor   = map[string]any{"type": "string", "maxLength": 500, "description": "What the thread waits for, e.g. a delivery."}
	dossierFollowUpProp = map[string]any{"type": []string{"string", "null"}, "format": "date", "description": "YYYY-MM-DD: when to look at the thread again, or null to clear. Not a task due date."}
	dossierTitleProp    = map[string]any{"type": "string", "minLength": 1, "maxLength": 200, "description": "The dossier's name."}
	dossierNoteProp     = map[string]any{"type": "string", "maxLength": 5000, "description": "Optional context for the thread."}
)

func init() {
	register(tool{def: func(Caller) Definition {
		return writeDef("create_dossier", "Create a dossier",
			"Create a dossier (a thread on the Reprendre le fil page) from existing tasks, in order. Use it when the user asks for a dossier, a thread or a follow-up of linked steps; use create_project for a project or folder of tasks.",
			object([]string{"title"}, map[string]any{
				"title": dossierTitleProp, "note": dossierNoteProp, "task_ids": dossierTaskIDsProp,
				"waiting": dossierWaitingProp, "waiting_for": dossierWaitingFor, "follow_up": dossierFollowUpProp,
				"client_request_id": requestIDProp, "id": chosenIDProp,
			}), false, false, []string{"title", "note", "waiting_for"}, true)
	}, plan: (*Registry).planCreateDossier})
	register(tool{def: func(Caller) Definition {
		return writeDef("update_dossier", "Update a dossier",
			"Change a dossier: rename it, set its note, replace its ordered steps (task_ids is the whole new list), put it on hold with waiting, waiting_for and follow_up, or resume it (waiting false). Only the fields you give change.",
			object([]string{"id"}, map[string]any{
				"id":    map[string]any{"type": "string", "description": "Dossier id (see list_dossiers)."},
				"title": dossierTitleProp, "note": dossierNoteProp, "task_ids": dossierTaskIDsProp,
				"waiting": dossierWaitingProp, "waiting_for": dossierWaitingFor, "follow_up": dossierFollowUpProp,
			}), false, true, []string{"title", "note", "waiting_for"}, false)
	}, plan: (*Registry).planUpdateDossier})
}

// dossierPatch reads the fields shared by create and update.
func (snap *snapshot) dossierPatch(c Caller, a args, patch map[string]json.RawMessage, creating bool) error {
	if v, has, err := a.contentText(c, "title", creating, 200); err != nil {
		return err
	} else if has {
		if strings.TrimSpace(v) == "" {
			return argErr("title: must not be empty")
		}
		patch["title"] = raw(strings.TrimSpace(v))
	}
	for _, f := range []struct {
		name string
		max  int
	}{{"note", 5000}, {"waiting_for", 500}} {
		if v, has, err := a.contentText(c, f.name, false, f.max); err != nil {
			return err
		} else if has {
			patch[f.name] = raw(v)
		}
	}
	if a.present("waiting") {
		b, err := a.boolean("waiting")
		if err != nil {
			return err
		}
		patch["waiting"] = raw(b)
	}
	if v, ok := a["follow_up"]; ok {
		if string(v) == "null" {
			patch["follow_up"] = nullRaw
		} else {
			d, err := a.date("follow_up")
			if err != nil || d == "" {
				return argErr("follow_up: must be a date in YYYY-MM-DD form or null")
			}
			patch["follow_up"] = raw(d)
		}
	}
	if a.present("task_ids") {
		var list []string
		if json.Unmarshal(a["task_ids"], &list) != nil {
			return argErr("task_ids: must be an array of task ids")
		}
		if len(list) > maxDossierSteps {
			return argErr(fmt.Sprintf("task_ids: at most %d steps", maxDossierSteps))
		}
		seen := map[string]bool{}
		ids := make([]string, 0, len(list))
		var missing []string
		for _, id := range list {
			id = strings.TrimSpace(id)
			if seen[id] {
				continue
			}
			seen[id] = true
			if t := snap.task(id); t == nil {
				missing = append(missing, id)
			} else if pid := rawStr(t, "project_id"); pid != "" && !opsync.CanWrite(snap.role(pid), "task", "completed_at") {
				return forbidden([]map[string]any{{"id": id, "reason": "read_only"}})
			}
			ids = append(ids, id)
		}
		if len(missing) > 0 {
			return notFound("task", missing)
		}
		patch["task_ids"] = raw(ids)
	}
	return nil
}

func (r *Registry) planCreateDossier(ctx context.Context, c Caller, a args, overlay ChangeSet) (Plan, error) {
	if err := a.only("", "title", "note", "task_ids", "waiting", "waiting_for", "follow_up", "client_request_id", "id"); err != nil {
		return Plan{}, err
	}
	seed, err := a.requestID(c)
	if err != nil {
		return Plan{}, err
	}
	snap, err := r.loadFor(ctx, c, overlay)
	if err != nil {
		return Plan{}, err
	}
	id, err := a.chosenID("")
	if err != nil {
		return Plan{}, err
	}
	chosen := map[string]bool{id: id != ""}
	if id == "" {
		id = entityID(seed, 0)
	}
	patch := map[string]json.RawMessage{}
	if err := snap.dossierPatch(c, a, patch, true); err != nil {
		return Plan{}, err
	}
	existing, err := r.dossiers(ctx, c.UserID, overlay)
	if err != nil {
		return Plan{}, err
	}
	for _, d := range existing {
		if str(d, "id") == id {
			return Plan{Result: result("create_dossier", []map[string]any{{"id": id, "status": "exists"}}, 0)}, nil
		}
	}
	now := stamp()
	patch["position"] = raw(now)
	patch["created_at"] = raw(now)
	patch["deleted_at"] = nullRaw
	if err := checkPatch("", "dossier", id, patch); err != nil {
		return Plan{}, err
	}
	cs := ChangeSet{{Entity: "dossier", EntityID: id, Create: true, Patch: patch, opSeed: seed}}
	if err := r.claimIDs(ctx, c, cs, chosen); err != nil {
		return Plan{}, err
	}
	return Plan{Result: result("create_dossier", []map[string]any{{"id": id, "status": "created"}}, 1), Changes: cs, Count: 1}, nil
}

func (r *Registry) planUpdateDossier(ctx context.Context, c Caller, a args, overlay ChangeSet) (Plan, error) {
	if err := a.only("", "id", "title", "note", "task_ids", "waiting", "waiting_for", "follow_up"); err != nil {
		return Plan{}, err
	}
	id, err := a.str("id")
	if err != nil || id == "" {
		return Plan{}, argErr("id: the dossier id is required")
	}
	snap, err := r.loadFor(ctx, c, overlay)
	if err != nil {
		return Plan{}, err
	}
	list, err := r.dossiers(ctx, c.UserID, overlay)
	if err != nil {
		return Plan{}, err
	}
	var d opsync.Entity
	for _, x := range list {
		if str(x, "id") == id {
			d = x
		}
	}
	if d == nil {
		return Plan{}, notFound("dossier", []string{id})
	}
	patch := map[string]json.RawMessage{}
	if err := snap.dossierPatch(c, a, patch, false); err != nil {
		return Plan{}, err
	}
	if len(patch) == 0 {
		return Plan{}, argErr("nothing to change: give at least one field besides id")
	}
	if err := checkPatch("", "dossier", id, patch); err != nil {
		return Plan{}, err
	}
	for f, v := range patch {
		if opsync.SameJSON(d[f], v) {
			delete(patch, f)
		}
	}
	if len(patch) == 0 {
		return Plan{Result: result("update_dossier", []map[string]any{{"id": id, "status": "unchanged"}}, 0)}, nil
	}
	cs := ChangeSet{{Entity: "dossier", EntityID: id, Patch: patch, Base: base(d, patch)}}
	return Plan{Result: result("update_dossier", []map[string]any{{"id": id, "status": "updated"}}, 1), Changes: cs, Count: 1}, nil
}
