/** Human-readable sizes shared by the backup and attachment surfaces. */

/** "12 bytes", "820 KB", "1.5 MB", "3.2 GB" (decimal KB and MB, one decimal
 * below 10 GB, none above; binary division by 1024). */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} ${n === 1 ? 'byte' : 'bytes'}`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 10 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}
