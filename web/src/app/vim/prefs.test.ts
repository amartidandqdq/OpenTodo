import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ADVANCED_KEY, clearVimPref, isVimEnabled, setVimEnabled, subscribeVim, VIM_KEY } from './prefs'

// Vitest runs in node: give the module a Storage-shaped stand-in.
class MemoryStorage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
}

const g = globalThis as { localStorage?: Storage }
let saved: Storage | undefined
beforeEach(() => {
  saved = g.localStorage
  g.localStorage = new MemoryStorage() as unknown as Storage
})
afterEach(() => {
  g.localStorage = saved
})

describe('vim preference', () => {
  it('defaults to off: a fresh device has no advanced shortcuts (declutter)', () => {
    expect(isVimEnabled()).toBe(false)
    expect(g.localStorage?.getItem(ADVANCED_KEY)).toBeNull()
  })

  it('a device that turned Vim on before keeps it: the earlier value is the fallback (declutter migration)', () => {
    g.localStorage?.setItem(VIM_KEY, '1')
    expect(isVimEnabled()).toBe(true)
    // The first write to the new switch ends the fallback, in either direction.
    setVimEnabled(false)
    expect(isVimEnabled()).toBe(false)
    expect(g.localStorage?.getItem(ADVANCED_KEY)).toBe('0')
    setVimEnabled(true)
    expect(isVimEnabled()).toBe(true)
  })

  it('an earlier value of off does not turn the switch on', () => {
    g.localStorage?.setItem(VIM_KEY, '0')
    expect(isVimEnabled()).toBe(false)
  })

  it('toggle notifies subscribers', () => {
    let calls = 0
    const off = subscribeVim(() => calls++)
    setVimEnabled(true)
    expect(isVimEnabled()).toBe(true)
    expect(g.localStorage?.getItem(ADVANCED_KEY)).toBe('1')
    setVimEnabled(false)
    expect(isVimEnabled()).toBe(false)
    expect(calls).toBe(2)
    off()
    setVimEnabled(true)
    expect(calls).toBe(2)
  })

  it('sign-out clears it, the earlier value too', () => {
    g.localStorage?.setItem(VIM_KEY, '1')
    setVimEnabled(true)
    clearVimPref()
    expect(isVimEnabled()).toBe(false)
    expect(g.localStorage?.getItem(ADVANCED_KEY)).toBeNull()
    expect(g.localStorage?.getItem(VIM_KEY)).toBeNull()
  })

  it('is off when storage is unavailable', () => {
    g.localStorage = undefined
    expect(isVimEnabled()).toBe(false)
    expect(() => setVimEnabled(true)).not.toThrow()
  })
})
