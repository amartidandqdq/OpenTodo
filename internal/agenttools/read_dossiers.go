package agenttools

import (
	"context"
	"encoding/json"
	"sort"

	opsync "github.com/OpenTodoApp/opentodo/internal/sync"
)

// ---- list_dossiers (OpenSpec change assistant-resume-dossiers) ----

type dossierText struct {
	Title      string `json:"title"`
	Note       string `json:"note,omitempty"`
	WaitingFor string `json:"waiting_for,omitempty"`
}

type dossierStep struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

type dossierOut struct {
	ID         string        `json:"id"`
	State      string        `json:"state"`
	Waiting    bool          `json:"waiting"`
	FollowUp   *string       `json:"follow_up"`
	Done       int           `json:"steps_done"`
	Total      int           `json:"steps_total"`
	Unavail    int           `json:"steps_unavailable,omitempty"`
	NextAction *string       `json:"next_action_task_id"`
	Steps      []dossierStep `json:"steps"`
	Untrusted  dossierText   `json:"untrusted_text"`
}

// dossiers is the user's live dossiers with the planned changes of the turn on top.
func (r *Registry) dossiers(ctx context.Context, userID string, overlay ChangeSet) ([]opsync.Entity, error) {
	list, err := r.list(ctx, userID, "dossier", false)
	if err != nil {
		return nil, err
	}
	byID := map[string]int{}
	for i, d := range list {
		byID[str(d, "id")] = i
	}
	for _, ch := range overlay {
		if ch.Entity != "dossier" {
			continue
		}
		if i, ok := byID[ch.EntityID]; ok {
			list[i] = merge(list[i], ch.Patch)
		} else if ch.Create {
			byID[ch.EntityID] = len(list)
			list = append(list, merge(opsync.Entity{"id": raw(ch.EntityID)}, ch.Patch))
		}
	}
	live := list[:0]
	for _, d := range list {
		if !deleted(d) {
			live = append(live, d)
		}
	}
	sort.SliceStable(live, func(i, j int) bool {
		if a, b := num(live[i], "position"), num(live[j], "position"); a != b {
			return a < b
		}
		return num(live[i], "created_at") < num(live[j], "created_at")
	})
	return live, nil
}

func idListOf(e opsync.Entity, field string) []string {
	var out []string
	if v, ok := e[field]; ok {
		_ = json.Unmarshal(v, &out)
	}
	return out
}

func (snap *snapshot) renderDossier(d opsync.Entity) dossierOut {
	out := dossierOut{ID: str(d, "id"), Waiting: boolean(d, "waiting"), FollowUp: strPtr(d, "follow_up"), Steps: []dossierStep{},
		Untrusted: dossierText{Title: str(d, "title"), Note: str(d, "note"), WaitingFor: str(d, "waiting_for")}}
	for _, id := range idListOf(d, "task_ids") {
		t := snap.task(id)
		if t == nil {
			out.Unavail++
			continue
		}
		done := !isOpen(t)
		out.Steps = append(out.Steps, dossierStep{ID: id, Title: str(t, "title"), Completed: done})
		out.Total++
		if done {
			out.Done++
		} else if out.NextAction == nil {
			next := id
			out.NextAction = &next
		}
	}
	switch {
	case out.Total == 0:
		out.State = "empty"
	case out.Done == out.Total:
		out.State = "finished"
	case out.Waiting:
		out.State = "waiting"
	default:
		out.State = "active"
	}
	return out
}

func (r *Registry) listDossiers(ctx context.Context, userID string, a args) (map[string]any, error) {
	if err := a.only(""); err != nil {
		return nil, err
	}
	snap, err := r.load(ctx, userID)
	if err != nil {
		return nil, err
	}
	list, err := r.dossiers(ctx, userID, nil)
	if err != nil {
		return nil, err
	}
	out := []dossierOut{}
	for _, d := range list {
		if len(out) == MaxItems {
			break
		}
		out = append(out, snap.renderDossier(d))
	}
	return map[string]any{"dossiers": out, "server_time": r.serverTime()}, nil
}

func init() {
	register(tool{
		def: readDef("list_dossiers", "List dossiers",
			"List the user's dossiers, the threads shown on the Reprendre le fil page: each is an ordered list of existing tasks with its state (active, waiting, finished or empty), progress, next action, waiting reason and follow-up date. A dossier is not a project: projects are listed with list_projects.",
			object(nil, map[string]any{})),
		read: (*Registry).listDossiers,
	})
}
