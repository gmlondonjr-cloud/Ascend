// Date helpers — work in the user's local calendar day, NOT UTC, so a
// session counts toward the day the user actually performed it in.

/** Returns "YYYY-MM-DD" for the local calendar day of `d` (defaults to now). */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Number of full calendar days between two local-day keys (b - a). */
export function daysBetween(aKey: string, bKey: string): number {
  const a = new Date(aKey + 'T00:00:00');
  const b = new Date(bKey + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/** Local-day key for `n` days after `key`. */
export function addDays(key: string, n: number): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDayKey(d);
}
