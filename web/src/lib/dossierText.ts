// A dossier's text as shown (resume-dossiers): a field this device could not decrypt
// reads as the translated placeholder, never as the envelope. Shared by the dossier
// screens and the task menus, which load with the shell.
import { UNDECRYPTABLE } from './e2ee'
import { t } from './i18n'

/** The server's content prefix: a row this device never decrypted is unavailable, not display text. */
const undecrypted = (value: string): boolean => value === UNDECRYPTABLE || value.startsWith('enc:v')

/** A content field the device could not decrypt: show the translated placeholder, never the envelope. */
export function dossierText(value: string | null | undefined): string {
  if (!value) return ''
  return undecrypted(value) ? t(UNDECRYPTABLE) : value
}

/** Whether a dossier content field cannot be read, so its edit control must stay closed. */
export function dossierTextLocked(value: string | null | undefined): boolean {
  return typeof value === 'string' && undecrypted(value)
}
