// Deterministic per-course palette so the same course always gets the same hue
// across views. Mirrors Canvas Planner's color-by-course visual scanning.

// Curated set of accessible Tailwind hues — both light/dark friendly.
const PALETTE: Array<{ dot: string; text: string; chip: string }> = [
  { dot: 'bg-rose-400',    text: 'text-rose-600 dark:text-rose-300',     chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60' },
  { dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-300',   chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60' },
  { dot: 'bg-emerald-400', text: 'text-emerald-600 dark:text-emerald-300', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60' },
  { dot: 'bg-sky-400',     text: 'text-sky-600 dark:text-sky-300',       chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60' },
  { dot: 'bg-violet-400',  text: 'text-violet-600 dark:text-violet-300', chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60' },
  { dot: 'bg-fuchsia-400', text: 'text-fuchsia-600 dark:text-fuchsia-300', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900/60' },
  { dot: 'bg-teal-400',    text: 'text-teal-600 dark:text-teal-300',     chip: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60' },
  { dot: 'bg-orange-400',  text: 'text-orange-600 dark:text-orange-300', chip: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60' },
]

function hash(input: string): number {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i)
  }
  return Math.abs(h)
}

export function courseColor(courseCode: string | undefined | null) {
  const key = (courseCode ?? '').trim()
  if (!key) return PALETTE[0]
  return PALETTE[hash(key) % PALETTE.length]
}
