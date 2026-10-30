// Advanced keyboard shortcuts (OpenSpec change declutter, keyboard-shortcuts "Advanced keyboard
// shortcuts are opt-in"): one device-local switch, "Advanced keyboard shortcuts (vim)", off by
// default. It turns on the Vim keymap and lists the Vim section of the cheat sheet. Stored in
// localStorage under ADVANCED_KEY, never synced and never sent to the server.
//
// The switch was first stored as VIM_KEY ("opentodo.vim"). A device with no value under
// ADVANCED_KEY still reads that earlier value, so an existing Vim user keeps Vim; the first
// write to the new key ends the fallback. This module is in the main bundle (Shell and
// Settings read it); the Vim layer itself is loaded lazily only while the switch is on.
import { useSyncExternalStore } from 'react'
import { createSignal } from '../../lib/store'
import { readString, removeItem, writeString } from '../../lib/deviceStorage'

export const ADVANCED_KEY = 'opentodo.advanced'
/** The earlier switch: read only as the fallback for a device with no value under ADVANCED_KEY. */
export const VIM_KEY = 'opentodo.vim'

const changes = createSignal()

/** Whether advanced keyboard shortcuts (the Vim keymap) are on for this device (off by default). */
export function isVimEnabled(): boolean {
  const raw = readString(ADVANCED_KEY)
  return raw === null ? readString(VIM_KEY) === '1' : raw === '1'
}

/** Turn the switch on or off; takes effect at once, without a reload. Storage refused: it does not stick. */
export function setVimEnabled(on: boolean): void {
  writeString(ADVANCED_KEY, on ? '1' : '0')
  changes.notify()
}

/** Sign-out wipes local data; the preference goes with it (App's logout calls this). */
export function clearVimPref(): void {
  removeItem(ADVANCED_KEY)
  removeItem(VIM_KEY)
  changes.notify()
}

/** Listens for changes on this page and, through the storage event, from another tab of the app. */
export function subscribeVim(listener: () => void): () => void {
  const off = changes.subscribe(listener)
  const onStorage = (e: StorageEvent) => { if (e.key === ADVANCED_KEY || e.key === VIM_KEY || e.key === null) listener() }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    off()
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

/** The switch as a render value (false while the page renders on the server). */
export function useVimEnabled(): boolean {
  return useSyncExternalStore(subscribeVim, isVimEnabled, () => false)
}
