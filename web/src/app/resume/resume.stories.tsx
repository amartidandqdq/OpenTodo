// The dossier screens (OpenSpec change resume-dossiers): the card's active, hold,
// finished and empty states, Pick up the thread on a seeded account, one dossier
// and Waiting above its task groups. The card stories take plain props; the page
// stories seed the local rows, as every screen story does.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { UNDECRYPTABLE } from '../../lib/e2ee'
import { attachTaskToDossier, createDossier, setDossierWaiting } from '../../lib/dossiers'
import { t } from '../../lib/i18n'
import { createTask } from '../../lib/ops'
import type { Dossier, Project, Task } from '../../lib/types'
import { PageBody, PageHeader } from '../../ui'
import { seedBase, seeded, task, project, TOMORROW, withClock, withSeed } from '../stories/fixtures'
import { DossierCard } from './DossierCard'
import { DossierView } from './DossierView'
import { ResumeView } from './ResumeView'
import { WaitingDossiers } from './WaitingDossiers'

const meta: Meta = { title: 'Screens/Resume', decorators: [withClock] }
export default meta

const home = project({ id: 'p-home', name: 'Home', color: '#60816b' })
const projects = new Map<string, Project>([[home.id, home]])
const quotes = task({ id: 't-quotes', title: 'Get three quotes', project_id: home.id, due: { date: TOMORROW } })
const fitters = task({ id: 't-fitters', title: 'Book the fitters', project_id: home.id })
const paint = task({ id: 't-paint', title: 'Choose the paint', completed_at: 1 })

function dossier(over: Partial<Dossier> = {}): Dossier {
  return {
    id: 'd-kitchen', title: 'Kitchen', note: 'The tiles arrive on Tuesday.', task_ids: [quotes.id, fitters.id, paint.id],
    waiting: false, waiting_for: '', follow_up: null, workspace_id: null, position: 1, created_at: 1, deleted_at: null, _clock: {},
    ...over,
  }
}

const cardArgs = { dossier: dossier(), tasks: [quotes, fitters, paint] as Task[], projects, focus: false }

/** A thread to advance: its first open task is the next action, and one of three steps is done. */
export const ActiveCard: StoryObj = { render: () => <DossierCard {...cardArgs} /> }

/** A wait is the dossier's own state: what is being waited for and the date, never a task due date. */
export const OnHoldCard: StoryObj = {
  render: () => <DossierCard {...cardArgs} dossier={dossier({ waiting: true, waiting_for: 'The tile delivery', follow_up: '2026-11-02' })} />,
}

/** Every live step is complete: the steps stay below, and the thread can be reopened. */
export const CompleteCard: StoryObj = {
  render: () => <DossierCard {...cardArgs} dossier={dossier({ task_ids: [paint.id] })} tasks={[paint]} />,
}

/** An empty dossier invites the first real task; it has no invented progress. */
export const EmptyCard: StoryObj = { render: () => <DossierCard {...cardArgs} dossier={dossier({ task_ids: [] })} tasks={[]} /> }

/** Content this device cannot decrypt is named as such; the envelope is never shown. */
export const EncryptedCard: StoryObj = {
  render: () => <DossierCard {...cardArgs} dossier={dossier({ title: UNDECRYPTABLE, note: UNDECRYPTABLE })} tasks={[]} />,
}

async function seedResume() {
  await seedBase()
  const quotesId = await createTask({ title: 'Get three quotes', project_id: seeded.home, due: { date: TOMORROW }, labels: [seeded.errand] })
  const fittersId = await createTask({ title: 'Book the fitters', project_id: seeded.home, labels: [seeded.deepWork] })
  const paintId = await createTask({ title: 'Choose the paint' })
  const kitchen = await createDossier('Kitchen', 'Three lists, one thread. Nothing moves from where it is.')
  for (const id of [quotesId, fittersId, paintId]) await attachTaskToDossier(kitchen.id, id)
  const bathroom = await createDossier('Bathroom')
  const tilerId = await createTask({ title: 'Book the tiler', labels: [seeded.errand] })
  await attachTaskToDossier(bathroom.id, tilerId)
  await setDossierWaiting(bathroom.id, 'the tiler\u2019s quote', '2026-11-02')
  seeded.dossier = kitchen.id
  seeded.waitingDossier = bathroom.id
}

/** Pick up the thread over real local rows: the featured thread, all dossiers and the label chips. */
export const Page: StoryObj = { ...withSeed(seedResume), render: () => <ResumeView /> }

/** One dossier: the ordered steps, the note, attach and the hold/edit controls. */
export const DossierPage: StoryObj = { ...withSeed(seedResume), render: () => <DossierView id={seeded.dossier} /> }

/** Waiting: dossiers on hold above the delegated and blocked groups (the groups are seeded by the method view). */
export const WaitingPage: StoryObj = {
  ...withSeed(seedResume),
  render: () => <PageBody width="list"><PageHeader title={t('Waiting', { context: 'method' })} icon="hourglass" /><WaitingDossiers /></PageBody>,
}
