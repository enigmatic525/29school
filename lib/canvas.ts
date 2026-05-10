import 'server-only'
import { sanitizeHtml } from './security'

export interface CanvasCourse {
  id: number
  name: string
  course_code: string
}

export interface CanvasAssignment {
  id: number
  name: string
  due_at: string | null
  points_possible: number
  course_id: number
  submission_types: string[]
  html_url: string
  is_quiz_assignment: boolean
  description?: string | null
  // added by our fetch layer
  courseName?: string
  courseCode?: string
}

const DOMAIN = process.env.CANVAS_DOMAIN!

function headers(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchProfile(token: string) {
  const res = await fetch(`https://${DOMAIN}/api/v1/users/self/profile`, {
    headers: headers(token),
  })
  if (!res.ok) throw new Error('Invalid token')
  return res.json() as Promise<{ id: number; name: string; primary_email: string }>
}

export async function fetchCourses(token: string): Promise<CanvasCourse[]> {
  const res = await fetch(
    `https://${DOMAIN}/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=100`,
    { headers: headers(token) }
  )
  if (!res.ok) throw new Error(`Canvas courses fetch failed: ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data
}

export async function fetchAssignments(token: string, courseId: number): Promise<CanvasAssignment[]> {
  const res = await fetch(
    `https://${DOMAIN}/api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at`,
    { headers: headers(token) }
  )
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data)) return []
  // Sanitise teacher-authored description HTML at the data boundary so every
  // downstream renderer gets safe content.
  return data.map((a: CanvasAssignment) => ({
    ...a,
    description: typeof a.description === 'string' ? sanitizeHtml(a.description) : a.description ?? null,
  }))
}

export async function fetchAllAssignments(token: string) {
  const courses = await fetchCourses(token)
  const results: CanvasAssignment[] = []

  await Promise.all(
    courses.map(async (course) => {
      const assignments = await fetchAssignments(token, course.id)
      for (const a of assignments) {
        if (a.due_at) {
          results.push({ ...a, courseName: course.name, courseCode: course.course_code })
        }
      }
    })
  )

  return { assignments: results, courses }
}

export type AssignmentType = 'ma' | 'qa' | 'hw' | 'cw' | 'other'

export function getAssignmentType(name: string): AssignmentType {
  const prefix = name.trim().toUpperCase()
  if (prefix.startsWith('MA:') || prefix.startsWith('MA ')) return 'ma'
  if (prefix.startsWith('QA:') || prefix.startsWith('QA ')) return 'qa'
  if (prefix.startsWith('HW/CW:') || prefix.startsWith('HW/CW ')) return 'hw'
  if (prefix.startsWith('HW:') || prefix.startsWith('HW ')) return 'hw'
  if (prefix.startsWith('CW:') || prefix.startsWith('CW ')) return 'cw'
  return 'other'
}

export async function submitTextOrUrl(
  token: string,
  courseId: number,
  assignmentId: number,
  type: 'online_text_entry' | 'online_url',
  payload: { body?: string; url?: string }
) {
  const res = await fetch(
    `https://${DOMAIN}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
    {
      method: 'POST',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission: { submission_type: type, ...payload } }),
    }
  )
  if (!res.ok) throw new Error(`Canvas submission failed: ${res.status}`)
  return res.json()
}

export async function submitFileAssignment(
  token: string,
  courseId: number,
  assignmentId: number,
  file: { name: string; size: number; type: string; buffer: ArrayBuffer }
) {
  // Step 1: Tell Canvas about the file to get an upload URL
  const initRes = await fetch(
    `https://${DOMAIN}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self/files`,
    {
      method: 'POST',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        content_type: file.type || 'application/octet-stream',
        on_duplicate: 'rename',
      }),
    }
  )
  if (!initRes.ok) throw new Error(`File upload init failed: ${initRes.status}`)
  const { upload_url, upload_params } = await initRes.json()

  // Step 2: Upload to Canvas/S3 storage
  const fd = new FormData()
  for (const [k, v] of Object.entries(upload_params as Record<string, string>)) {
    fd.append(k, v)
  }
  fd.append('file', new Blob([file.buffer], { type: file.type }), file.name)

  const uploadRes = await fetch(upload_url, { method: 'POST', body: fd, redirect: 'manual' })

  let fileId: number
  if (uploadRes.status >= 300 && uploadRes.status < 400) {
    // S3 redirects back to Canvas to confirm — follow with auth header
    const location = uploadRes.headers.get('location')
    if (!location) throw new Error('Upload redirect missing Location header')
    const confirmRes = await fetch(location, { headers: headers(token) })
    if (!confirmRes.ok) throw new Error(`File confirm failed: ${confirmRes.status}`)
    fileId = (await confirmRes.json()).id
  } else if (uploadRes.ok) {
    fileId = (await uploadRes.json()).id
  } else {
    throw new Error(`File upload failed: ${uploadRes.status}`)
  }

  // Step 3: Submit the assignment with the uploaded file ID
  const submitRes = await fetch(
    `https://${DOMAIN}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
    {
      method: 'POST',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission: { submission_type: 'online_upload', file_ids: [fileId] },
      }),
    }
  )
  if (!submitRes.ok) throw new Error(`Assignment submit failed: ${submitRes.status}`)
  return submitRes.json()
}

export function getAssignmentScore(name: string): number {
  switch (getAssignmentType(name)) {
    case 'ma': return 10
    case 'qa': return 5
    case 'hw': return 1
    case 'cw':
    case 'other':
    default: return 0
  }
}

export interface SubmissionComment {
  id: number | string
  author: string
  text: string
  createdAt: string | null
}

export interface RubricCriterionResult {
  id: string
  description: string | null
  longDescription: string | null
  points: number | null
  maxPoints: number | null
  ratingDescription: string | null
  comment: string | null
}

export interface GradedSubmission {
  id: number
  assignmentName: string
  courseCode: string
  score: number | null
  grade: string | null
  pointsPossible: number | null
  gradedAt: string
  htmlUrl: string | null
  comments: SubmissionComment[]
  rubric: RubricCriterionResult[]
}

export async function fetchRecentSubmissions(token: string, courses: CanvasCourse[]): Promise<GradedSubmission[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const perCourse = await Promise.all(
    courses.map(async (course) => {
      try {
        const res = await fetch(
          `https://${DOMAIN}/api/v1/courses/${course.id}/students/submissions?student_ids[]=self&include[]=assignment&include[]=submission_comments&include[]=rubric_assessment&per_page=50`,
          { headers: headers(token) }
        )
        if (!res.ok) return []
        const data = await res.json()
        if (!Array.isArray(data)) return []

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.filter((s: any) => {
          if (!s.graded_at) return false
          if (s.score === null && !s.grade) return false
          return new Date(s.graded_at) >= cutoff
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).map((s: any) => {
          const a = s.assignment as Record<string, unknown> | undefined
          const score = typeof s.score === 'number' ? s.score : null
          const pp = typeof a?.points_possible === 'number' ? a.points_possible : null

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawComments = Array.isArray(s.submission_comments) ? s.submission_comments as any[] : []
          const comments: SubmissionComment[] = rawComments
            .filter((c) => typeof c?.comment === 'string' && c.comment.trim() !== '')
            .map((c) => ({
              id: (c.id as number | string) ?? `${s.id}-${c.created_at ?? ''}`,
              author: typeof c.author_name === 'string' && c.author_name
                ? c.author_name
                : 'Teacher',
              text: c.comment as string,
              createdAt: typeof c.created_at === 'string' ? c.created_at : null,
            }))

          // Rubric: assignment.rubric provides definitions; submission.rubric_assessment provides scores
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rubricDefs = Array.isArray((a as any)?.rubric) ? ((a as any).rubric as any[]) : []
          const rubricAssessment = (s.rubric_assessment ?? null) as Record<string, {
            points?: number
            comments?: string
            rating_id?: string
          }> | null
          const rubric: RubricCriterionResult[] = rubricAssessment
            ? Object.entries(rubricAssessment).map(([critId, val]) => {
                const def = rubricDefs.find((d) => d?.id === critId)
                let ratingDescription: string | null = null
                if (def && Array.isArray(def.ratings) && val.rating_id) {
                  const r = def.ratings.find((r: { id?: string }) => r?.id === val.rating_id)
                  if (r && typeof r.description === 'string') ratingDescription = r.description
                }
                return {
                  id: critId,
                  description: typeof def?.description === 'string' ? def.description : null,
                  longDescription: typeof def?.long_description === 'string' ? def.long_description : null,
                  points: typeof val.points === 'number' ? val.points : null,
                  maxPoints: typeof def?.points === 'number' ? def.points : null,
                  ratingDescription,
                  comment: typeof val.comments === 'string' && val.comments.trim() ? val.comments : null,
                }
              })
            : []

          return {
            id: s.id as number,
            assignmentName: (a?.name as string) ?? 'Unknown Assignment',
            courseCode: course.course_code,
            score,
            grade: typeof s.grade === 'string' ? s.grade : null,
            pointsPossible: pp,
            gradedAt: s.graded_at as string,
            htmlUrl: typeof s.preview_url === 'string'
              ? s.preview_url
              : (typeof (a as { html_url?: unknown })?.html_url === 'string'
                ? (a as { html_url: string }).html_url
                : null),
            comments,
            rubric,
          } satisfies GradedSubmission
        })
      } catch {
        return []
      }
    })
  )

  return perCourse.flat().sort((a, b) =>
    new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime()
  )
}

export interface CourseGrade {
  courseId: number
  courseName: string
  courseCode: string
  currentScore: number | null
  currentGrade: string | null
}

export async function fetchGrades(token: string): Promise<CourseGrade[]> {
  const res = await fetch(
    `https://${DOMAIN}/api/v1/courses?enrollment_type=student&enrollment_state=active&include[]=total_scores&per_page=100`,
    { headers: headers(token) }
  )
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data)) return []

  const results: CourseGrade[] = []
  for (const course of data) {
    const enrollment = Array.isArray(course.enrollments) ? course.enrollments[0] : null
    const score = enrollment?.computed_current_score ?? null
    const grade = enrollment?.computed_current_grade ?? null
    if (score !== null || grade !== null) {
      results.push({
        courseId: course.id,
        courseName: course.name,
        courseCode: course.course_code,
        currentScore: typeof score === 'number' ? score : null,
        currentGrade: typeof grade === 'string' ? grade : null,
      })
    }
  }
  return results
}
