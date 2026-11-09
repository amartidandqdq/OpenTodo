package agenttools

import (
	"context"
	"sync"
)

// lastChanged is when each task the user can see last changed: the newest
// winning field value of it (opsync.Service.LastChanged), read once per
// snapshot and only when a task is rendered (OpenSpec change simple-mode,
// design D6: the tidy-up skill tells stale tasks by it). Plaintext metadata,
// so encrypted accounts have it too. A nil value or a failed read leaves
// changed_at out.
type lastChanged = *changedTimes

type changedTimes struct {
	once sync.Once
	read func() map[string]int64
	byID map[string]int64
}

// lastChangedOf reads lazily within the tool call that loaded the snapshot.
func (r *Registry) lastChangedOf(ctx context.Context, userID string) lastChanged {
	if r.sync == nil {
		return nil
	}
	return &changedTimes{read: func() map[string]int64 {
		m, err := r.sync.LastChanged(ctx, userID, "task")
		if err != nil {
			r.log.Warn("agent tools: last changed times", "err", err)
			return nil
		}
		return m
	}}
}

// at is the task's last change as RFC 3339 UTC, or nil when unknown.
func (c *changedTimes) at(id string) *string {
	if c == nil {
		return nil
	}
	c.once.Do(func() { c.byID = c.read() })
	return isoTime(float64(c.byID[id]))
}
