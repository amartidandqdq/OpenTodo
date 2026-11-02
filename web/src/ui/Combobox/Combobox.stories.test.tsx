// @vitest-environment happy-dom
import type { ReactElement } from 'react'
import { expect, it } from 'vitest'
import { render, waitFor } from '../test-utils'
import { AsyncSource } from './Combobox.stories'

it('keeps the async story pending until its result options are rendered', async () => {
  const Story = AsyncSource.render as () => ReactElement
  const { container, unmount } = await render(<Story />)
  expect(container.querySelector('[data-story-pending]')).not.toBeNull()
  expect(container.querySelector('[role="option"]')).toBeNull()

  await waitFor(() => !container.querySelector('[data-story-pending]'), 'the loaded async story')
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(50)
  expect(container.textContent).not.toContain('Loading…')
  await unmount()
})
