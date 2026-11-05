import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'
import { createProject, createSubtask, createTask } from '../../lib/ops'
import type { Task } from '../../lib/types'
import { seeded, withSeed } from '../stories/fixtures'
import { SimpleColumnView, type ColumnActions } from './SimpleColumn'
import { SimpleField } from './SimpleField'
import { SimpleRow } from './SimpleRow'
import { SimpleScreen } from './SimpleScreen'

// Simple mode (OpenSpec change simple-mode, task 4.7): the screen, seeded like a
// Google Tasks account, and its row, column and field on their own.
const meta: Meta = { title: 'Screens/Simple', parameters: { layout: 'fullscreen' } }
export default meta

async function seedLists(): Promise<void> {
  const admin = await createProject({ name: 'Admin' })
  const car = await createProject({ name: 'Car' })
  await createProject({ name: 'Home' })
  await createTask({ title: 'Buy paint' })
  await createTask({ title: 'Print diploma', priority: 1 })
  const bank = await createTask({ title: 'Close bank account', project_id: admin, due: { date: new Date().toISOString().slice(0, 10) } })
  await createSubtask(bank, 'Download statements')
  await createSubtask(bank, 'Move standing orders')
  await createTask({ title: 'BMW new tyres', project_id: car })
  const done = await createTask({ title: 'Call the garage', project_id: car })
  await createTask({ title: 'Renew insurance', project_id: car, due: { date: '2026-12-01' } })
  seeded.car = car
  seeded.done = done
}

/** The board at desktop width: My tasks, then each list. */
export const Board: StoryObj = { ...withSeed(seedLists), render: () => <SimpleScreen /> }

const task = (over: Partial<Task>): Task => ({
  id: over.id ?? 't1', title: 'Order tyres', description: '', project_id: null, section_id: null, parent_id: null, position: 1, priority: 4,
  due: null, labels: [], completed_at: null, deleted_at: null, created_at: 0, ...over,
} as Task)
const noop = () => {}
const actions: ColumnActions = { toggle: noop, star: noop, open: noop, select: noop, add: async () => {}, drop: noop, canEdit: () => true }

/** Rows: plain, starred with a due date, a subtask with a count, completed. */
export const Rows: StoryObj = {
  render: () => (
    <ul className="w-80 bg-surface p-2">
      <SimpleRow task={task({ id: 'a' })} onToggle={noop} onStar={noop} onOpen={noop} />
      <SimpleRow task={task({ id: 'b', title: 'Close the bank account', priority: 1, due: { date: '2026-11-06' } })} selected onToggle={noop} onStar={noop} onOpen={noop} />
      <SimpleRow task={task({ id: 'c', title: 'Download statements', parent_id: 'b' })} sub childCount={2} onToggle={noop} onStar={noop} onOpen={noop} />
      <SimpleRow task={task({ id: 'd', title: 'Call the garage', completed_at: 1 })} onToggle={noop} onStar={noop} onOpen={noop} />
    </ul>
  ),
}

/** One column with its completed row. */
export const Column: StoryObj = {
  render: () => (
    <div className="bg-canvas p-4">
      <SimpleColumnView active selectedId={null} dragging={null} setDragging={noop} actions={actions} column={{
        id: 'car', name: 'Car',
        rows: [{ task: task({ id: 'r1', title: 'BMW new tyres' }), subtasks: [] }, { task: task({ id: 'r2', title: 'Renew insurance', priority: 1 }), subtasks: [{ task: task({ id: 'r3', title: 'Compare quotes', parent_id: 'r2' }), childCount: 0 }] }],
        completed: [task({ id: 'r4', title: 'Call the garage', completed_at: 1 })],
      }} />
    </div>
  ),
}

function FieldDemo({ ask }: { ask: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex bg-canvas p-4">
      <SimpleField inputRef={ref} listName="Car" onAdd={async () => {}} notice={null}
        assistant={ask ? { ask: () => true, run: () => true, selectedTitle: null } : null} />
    </div>
  )
}

/** The field with Ask and the AI actions. */
export const Field: StoryObj = { render: () => <FieldDemo ask /> }

/** The field without the assistant: it only adds tasks. */
export const FieldWithoutAssistant: StoryObj = { render: () => <FieldDemo ask={false} /> }
