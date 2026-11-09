// The Simple screen's writes (OpenSpec change simple-mode): the star and a drop. Its
// own module, so they load with the screen, not with the shell. Each is one undoable
// batch, like every action of lib/undoActions.
import { planMove, readTicked } from './bulk'
import { db } from './db'
import { t } from './i18n'
import { currentUserId, membershipMap } from './sharing'
import type { Task } from './types'
import { apply, type UndoableResult } from './undoActions'
import { keepWorkspaceFor } from './workspaces'

/**
 * The Simple screen's star (simple-mode "The star"): priority 1 or 4, one field,
 * one undoable change.
 */
export async function starUndoable(id: string, starred: boolean): Promise<UndoableResult> {
  const task = await db.tasks.get(id)
  const priority = starred ? 1 : 4
  if (!task || task.deleted_at || task.priority === priority) return { entry: null, label: '' }
  return apply([{ entity: 'task', entityId: id, patch: { priority } }], starred ? t('Starred') : t('Star removed'))
}

/**
 * A Simple screen drop (simple-mode "Task rows"): the task's place in a column. In
 * the same project only its section and position change; to another column it moves
 * with its subtree (planMove, sharing scopes included) and lands at that position.
 * One batch, one undo step.
 */
export async function placeUndoable(id: string, target: { projectId: string | null; sectionId: string | null; position: number }, targetName: string, now = Date.now()): Promise<UndoableResult> {
  const { tasks, all } = await readTicked([id])
  const task = tasks[0]
  if (!task) return { entry: null, label: '' }
  if ((task.project_id ?? null) === target.projectId) {
    const patch: Partial<Task> = {}
    if ((task.section_id ?? null) !== target.sectionId) patch.section_id = target.sectionId
    if (task.position !== target.position) patch.position = target.position
    if (!Object.keys(patch).length) return { entry: null, label: '' }
    return apply([{ entity: 'task', entityId: id, patch }], t('Task moved'))
  }
  const changes = planMove([task], all, { projectId: target.projectId, sectionId: null }, await membershipMap(), await currentUserId(), now, await keepWorkspaceFor())
  const own = changes.find((c) => c.entity === 'task' && c.entityId === id && !c.patch.deleted_at)
  if (own) own.patch = { ...own.patch, position: target.position }
  return apply(changes, t('Moved to {target}', { target: targetName }))
}
