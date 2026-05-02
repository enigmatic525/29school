import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { fetchAllAssignments, getAssignmentScore, type CanvasAssignment } from '@/lib/canvas'
import CalendarHeatmap from '@/components/CalendarHeatmap'

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function mondayOf(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function summarize(assignments: CanvasAssignment[]) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = mondayOf(now)
  const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))

  let dueToday = 0
  let weekScore = 0
  let nextDue: CanvasAssignment | null = null
  let nextDueAt = Infinity

  for (const a of assignments) {
    if (!a.due_at) continue
    const due = new Date(a.due_at)
    const t = due.getTime()
    if (t >= todayStart.getTime() && t <= todayEnd.getTime()) dueToday++
    if (t >= weekStart.getTime() && t <= weekEnd.getTime()) {
      weekScore += getAssignmentScore(a.name)
    }
    if (t >= now.getTime() && t < nextDueAt) {
      nextDueAt = t
      nextDue = a
    }
  }

  return { dueToday, weekScore, nextDue, total: assignments.length }
}

function relativeWhen(due: Date): string {
  const ms = due.getTime() - Date.now()
  if (ms < 0) return 'overdue'
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours}h`
  const days = Math.round(hours / 24)
  if (days < 14) return `in ${days}d`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function DashboardPage() {
  const session = await getSession()
  // Defense-in-depth: the layout redirects unauthenticated requests, but in
  // Next 16 the page renders in parallel with the layout. Skip the Canvas
  // fetch if there's no token to avoid spurious 401s in the logs.
  if (!session.isLoggedIn || !session.canvasToken) redirect('/login')

  const { assignments } = await fetchAllAssignments(session.canvasToken)
  const { dueToday, weekScore, nextDue, total } = summarize(assignments)

  if (total === 0) {
    return (
      <>
        <h1 className="mb-1 text-xl font-light">My Workload</h1>
        <p className="mb-8 text-xs text-gray-400">Pulled live from Canvas</p>
        <div className="border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">No assignments with due dates yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            We only show assignments that have a due date set in Canvas. Check back after your
            teachers post the next batch.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-light">My Workload</h1>
      <p className="mb-8 text-xs text-gray-400">
        Pulled live from Canvas · {total} upcoming assignment{total === 1 ? '' : 's'}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Due today" value={String(dueToday)} accent={dueToday > 0} />
        <SummaryCard
          label="This week"
          value={String(weekScore)}
          accent={weekScore >= 30}
          hint={weekScore >= 30 ? 'heavy' : undefined}
        />
        <SummaryCard
          label="Next due"
          value={nextDue ? relativeWhen(new Date(nextDue.due_at!)) : '—'}
          subtle={nextDue?.courseCode ?? ''}
        />
        <SummaryCard label="Tracked" value={String(total)} subtle="assignments" />
      </div>

      <CalendarHeatmap assignments={assignments} />

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-400">
        <span className="font-medium text-gray-500">Scoring:</span>
        <Legend className="bg-red-100 text-red-600" label="MA · 10" />
        <Legend className="bg-amber-100 text-amber-700" label="QA · 5" />
        <Legend className="bg-blue-100 text-blue-600" label="HW · 1" />
        <Legend className="bg-gray-100 text-gray-500" label="Other · 0" />
        <span className="ml-auto">Weeks with score ≥ 30 are flagged red.</span>
      </div>
    </>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  subtle,
  accent,
}: {
  label: string
  value: string
  hint?: string
  subtle?: string
  accent?: boolean
}) {
  return (
    <div
      className={`border p-3 ${
        accent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p
        className={`mt-1 text-lg font-light leading-none ${
          accent ? 'text-red-700' : 'text-gray-900'
        }`}
      >
        {value}
        {hint && <span className="ml-1.5 text-[10px] text-red-500 align-middle">{hint}</span>}
      </p>
      {subtle && <p className="mt-1 text-[10px] text-gray-400">{subtle}</p>}
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-light ${className}`}>
      {label}
    </span>
  )
}
