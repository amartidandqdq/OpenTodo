package sync

import (
	"database/sql"
	"encoding/json"
	"errors"
)

// Dossiers (OpenSpec change resume-dossiers): a personal, ordered thread of
// existing tasks. The entity is personal, but its task_ids may name tasks in a
// shared project the author can see; an id that lives only in another account's
// personal scope is refused, so a dossier never becomes a way to probe or
// reference someone else's data.

// checkDossierTasks checks every task id of a dossier's order. The field is a
// whole ordered list, so a bad id refuses the field and leaves the stored order
// untouched. A reference must name a task the author can see, or a task created
// in the same batch (an offline create and attach travels together).
//
// A member already present in the stored order is always accepted, even when the
// task has since been deleted, purged or become invisible: access loss must not
// make the remaining members uneditable, and its id is already the author's. The
// client shows such a member as unavailable and removes it only when the person
// asks; the server never rewrites the order by itself.
func (r *resolver) checkDossierTasks(op Op) (reason string, err error) {
	list := idList(op.Value)
	if len(list) == 0 {
		return "", nil
	}
	stored, err := r.storedDossierTasks(op.EntityID)
	if err != nil {
		return "", err
	}
	for _, id := range list {
		if stored[id] {
			continue
		}
		scope, found, err := r.existingChildScope("task", id)
		if err != nil {
			return "", err
		}
		if !found {
			if !r.batchTasks[id] {
				// Not a task this server knows and not one this batch creates:
				// permanently empty references would make the order lie.
				r.detail = id
				return ReasonForbidden, nil
			}
			if scope, err = r.scopeOfChild("task", id); err != nil {
				return "", err
			}
		}
		if scope == "" || !r.acc.canSee(scope) {
			r.detail = id
			return ReasonForbidden, nil
		}
	}
	return "", nil
}

// storedDossierTasks is the current order of a dossier in the author's personal
// scope, by id. A dossier that does not exist yet has no preserved members.
func (r *resolver) storedDossierTasks(id string) (map[string]bool, error) {
	var raw string
	err := r.tx.QueryRowContext(r.ctx, `SELECT value FROM scope_fields
		WHERE scope_id = ? AND entity = 'dossier' AND entity_id = ? AND field = 'task_ids'`,
		r.acc.personal, id).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	out := map[string]bool{}
	for _, taskID := range idList(json.RawMessage(raw)) {
		out[taskID] = true
	}
	return out, nil
}
