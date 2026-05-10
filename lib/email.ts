import 'server-only'
import { Resend } from 'resend'
import { escapeHtml } from './security'
import type { GradedSubmission } from './canvas'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const FROM = 'alerts@29.school'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://29.school'

interface SendResult {
  ok: boolean
  error?: string
}

function gradesUrl(): string {
  return `${APP_URL.replace(/\/$/, '')}/grades`
}

function settingsUrl(): string {
  return `${APP_URL.replace(/\/$/, '')}/settings`
}

function fmtScore(g: GradedSubmission): string {
  if (g.score !== null && g.pointsPossible !== null && g.pointsPossible > 0) {
    const pct = Math.round((g.score / g.pointsPossible) * 100)
    const score = g.score % 1 === 0 ? g.score : g.score.toFixed(1)
    return `${score} / ${g.pointsPossible} (${pct}%)`
  }
  if (g.score !== null) return `${g.score} pts`
  return g.grade ?? '—'
}

function gradeRowHtml(g: GradedSubmission): string {
  const courseCode = escapeHtml(g.courseCode)
  const name = escapeHtml(g.assignmentName)
  const score = escapeHtml(fmtScore(g))
  const commentCount = g.comments.length
  const rubricCount = g.rubric.length
  const extras: string[] = []
  if (commentCount > 0) extras.push(`${commentCount} comment${commentCount === 1 ? '' : 's'}`)
  if (rubricCount > 0) extras.push(`${rubricCount} rubric criterion${rubricCount === 1 ? '' : 'a'}`)
  const extrasLine = extras.length
    ? `<p style="margin:6px 0 0 0;color:#888;font-size:12px">${escapeHtml(extras.join(' · '))}</p>`
    : ''
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #eee">
        <p style="margin:0 0 2px 0;color:#888;font-size:11px">${courseCode}</p>
        <p style="margin:0;color:#111;font-size:14px;font-weight:400">${name}</p>
        <p style="margin:6px 0 0 0;color:#111;font-size:14px"><strong>${score}</strong></p>
        ${extrasLine}
      </td>
    </tr>
  `
}

function plainBody(grades: GradedSubmission[]): string {
  const lines = [
    grades.length === 1
      ? 'A new grade was just posted on Canvas.'
      : `${grades.length} new grades were just posted on Canvas.`,
    '',
  ]
  for (const g of grades) {
    lines.push(`• [${g.courseCode}] ${g.assignmentName} — ${fmtScore(g)}`)
  }
  lines.push('', `View all: ${gradesUrl()}`, '', `Manage notifications: ${settingsUrl()}`)
  return lines.join('\n')
}

function htmlBody(grades: GradedSubmission[]): string {
  const headline =
    grades.length === 1
      ? '1 new grade posted'
      : `${grades.length} new grades posted`
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <p style="margin:0 0 20px 0;color:#888;font-size:11px;letter-spacing:0.1em;text-transform:uppercase">29.school</p>
      <h1 style="margin:0 0 4px 0;font-size:18px;font-weight:400">${escapeHtml(headline)}</h1>
      <p style="margin:0 0 16px 0;color:#666;font-size:13px">From eastsideprep.instructure.com</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${grades.map(gradeRowHtml).join('')}
      </table>
      <p style="margin:24px 0 0 0">
        <a href="${escapeHtml(gradesUrl())}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;font-size:13px">View on 29.school</a>
      </p>
      <p style="margin:32px 0 0 0;color:#aaa;font-size:11px">
        You're receiving this because you enabled grade alerts.
        <a href="${escapeHtml(settingsUrl())}" style="color:#aaa">Manage notifications</a>.
      </p>
    </div>
  `
}

export async function sendGradeAlert(args: {
  to: string
  grades: GradedSubmission[]
}): Promise<SendResult> {
  if (args.grades.length === 0) return { ok: true }
  const subject =
    args.grades.length === 1
      ? `New grade in ${args.grades[0]!.courseCode}: ${fmtScore(args.grades[0]!)}`
      : `${args.grades.length} new grades posted`
  const { error } = await getResend().emails.send({
    from: FROM,
    to: args.to,
    subject,
    html: htmlBody(args.grades),
    text: plainBody(args.grades),
  })
  if (error) {
    console.error('sendGradeAlert error:', error.message)
    return { ok: false, error: 'Could not send' }
  }
  return { ok: true }
}

export async function sendTestEmail(to: string): Promise<SendResult> {
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <p style="margin:0 0 20px 0;color:#888;font-size:11px;letter-spacing:0.1em;text-transform:uppercase">29.school</p>
      <h1 style="margin:0 0 4px 0;font-size:18px;font-weight:400">Test email</h1>
      <p style="margin:0 0 16px 0;color:#666;font-size:13px">
        If you're reading this, grade alerts will reach you here.
      </p>
      <p style="margin:24px 0 0 0">
        <a href="${escapeHtml(settingsUrl())}" style="color:#666;font-size:12px">Manage notifications</a>
      </p>
    </div>
  `
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: '29.school — test email',
    html,
    text: `Test email from 29.school. If you're reading this, grade alerts will reach you here.\n\nManage notifications: ${settingsUrl()}`,
  })
  if (error) {
    console.error('sendTestEmail error:', error.message)
    return { ok: false, error: 'Could not send' }
  }
  return { ok: true }
}

export async function sendPausedNotice(to: string): Promise<SendResult> {
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <p style="margin:0 0 20px 0;color:#888;font-size:11px;letter-spacing:0.1em;text-transform:uppercase">29.school</p>
      <h1 style="margin:0 0 4px 0;font-size:18px;font-weight:400">Grade alerts paused</h1>
      <p style="margin:0 0 12px 0;color:#444;font-size:13px">
        Your stored Canvas token stopped working — likely it was revoked or expired.
        Grade alerts have been paused.
      </p>
      <p style="margin:0 0 20px 0;color:#444;font-size:13px">
        Sign in again with a fresh token to resume.
      </p>
      <p>
        <a href="${escapeHtml(APP_URL)}/login" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;font-size:13px">Sign in to 29.school</a>
      </p>
    </div>
  `
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: '29.school — grade alerts paused',
    html,
    text: `Your stored Canvas token stopped working. Grade alerts paused. Sign in to resume: ${APP_URL}/login`,
  })
  if (error) {
    console.error('sendPausedNotice error:', error.message)
    return { ok: false, error: 'Could not send' }
  }
  return { ok: true }
}
