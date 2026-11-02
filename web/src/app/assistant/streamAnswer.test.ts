import { expect, it } from 'vitest'
import { streamAnswer } from './useAssistantConversation'

// The model speaks between tool calls; each call's status line ends a paragraph
// so the pieces do not run together ("existants.Bons repères").
it('puts a paragraph break where a tool call separated two pieces of text', async () => {
  const out = await streamAnswer({} as never, new AbortController().signal, { text: () => {}, status: () => {} }, async (_req, onEvent) => {
    onEvent({ type: 'text', text: 'Je regarde vos projets.' })
    onEvent({ type: 'status', text: 'Looking at your projects…' })
    onEvent({ type: 'status', text: 'Searching tasks…' })
    onEvent({ type: 'text', text: 'Analyse faite.' })
  })
  expect(out.answer.text).toBe('Je regarde vos projets.\n\nAnalyse faite.')
})

it('leaves no trailing blank lines when a call ends the turn', async () => {
  const out = await streamAnswer({} as never, new AbortController().signal, { text: () => {}, status: () => {} }, async (_req, onEvent) => {
    onEvent({ type: 'text', text: 'Je propose.' })
    onEvent({ type: 'status', text: 'Preparing changes…' })
  })
  expect(out.answer.text).toBe('Je propose.')
})
