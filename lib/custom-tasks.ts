// Personal to-do items the student adds themselves — kept alongside Canvas
// assignments in the Dashboard list. Stored client-side only, like the
// completed-assignment and planned-date state.

export interface CustomTask {
  id: string
  title: string
  date: string // YYYY-MM-DD
  courseCode?: string
  done: boolean
}

const KEY = '29-custom-tasks'

export function loadCustomTasks(): CustomTask[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter(
      (t): t is CustomTask =>
        !!t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.date === 'string' &&
        typeof t.done === 'boolean',
    )
  } catch {
    return []
  }
}

export function saveCustomTasks(tasks: CustomTask[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks))
  } catch {}
}
