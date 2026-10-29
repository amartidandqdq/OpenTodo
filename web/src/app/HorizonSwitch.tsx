// The horizon switch (OpenSpec change declutter, method-views "Horizon switch"): one row
// of buttons over Next, Waiting, Anytime and Someday, so the four lists are one place in
// the sidebar. Each button is a plain navigation (a page, not a tab panel), marked with
// aria-current on the open horizon.
import { t } from '../lib/i18n'
import { navigate } from './router'

export const HORIZON_VIEWS = ['next', 'waiting', 'anytime', 'someday'] as const
export type HorizonView = (typeof HORIZON_VIEWS)[number]

export function HorizonSwitch({ view }: { view: HorizonView }) {
  const labels: Record<HorizonView, string> = {
    next: t('Next', { context: 'method' }),
    waiting: t('Waiting', { context: 'method' }),
    anytime: t('Anytime'),
    someday: t('Someday'),
  }
  return (
    <nav aria-label={t('Horizon')} data-horizon-switch className="flex flex-wrap gap-1">
      {HORIZON_VIEWS.map((h) => (
        <button key={h} type="button" data-horizon={h} aria-current={h === view ? 'page' : undefined} onClick={() => navigate({ view: h })}
          className={`rounded-control px-3 py-1 text-meta touch-target ${h === view ? 'bg-accent text-on-accent' : 'text-default hover:bg-sunken dark:hover:bg-raised'}`}>
          {labels[h]}
        </button>
      ))}
    </nav>
  )
}
