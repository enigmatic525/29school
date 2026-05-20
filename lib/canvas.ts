import 'server-only'
import { sanitizeHtml, isSafeHttpUrl } from './security'
import type {
  AssignmentGroupSummary,
  CanvasAssignment,
  CanvasCourse,
  CourseGrade,
  CourseGradeBreakdown,
  GradeAssignment,
  GradedSubmission,
  RubricCriterionResult,
  SubmissionAttachment,
  SubmissionComment,
  SubmissionDetail,
} from './canvas-shared'

export type {
  AssignmentGroupSummary,
  AssignmentType,
  CanvasAssignment,
  CanvasCourse,
  CourseGrade,
  CourseGradeBreakdown,
  GradeAssignment,
  GradedSubmission,
  RubricCriterionResult,
  SubmissionAttachment,
  SubmissionComment,
  SubmissionDetail,
} from './canvas-shared'
export { getAssignmentScore, getAssignmentType } from './canvas-shared'

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
    `https://${DOMAIN}/api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`,
    { headers: headers(token) }
  )
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data)) return []
  // Sanitise teacher-authored description HTML at the data boundary so every
  // downstream renderer gets safe content. Lift submission state into flat
  // fields so the client never has to traverse Canvas's response shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((a: any) => {
    const sub = a?.submission as Record<string, unknown> | undefined
    const workflow = typeof sub?.workflow_state === 'string' ? sub.workflow_state : null
    return {
      ...a,
      description: typeof a.description === 'string' ? sanitizeHtml(a.description) : a.description ?? null,
      submissionState:
        workflow === 'submitted' || workflow === 'graded' || workflow === 'pending_review' || workflow === 'unsubmitted'
          ? workflow
          : null,
      submittedAt: typeof sub?.submitted_at === 'string' ? sub.submitted_at : null,
      isLate: sub?.late === true,
      isMissing: sub?.missing === true,
      score: typeof sub?.score === 'number' ? sub.score : null,
    } satisfies CanvasAssignment
  })
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

// Post a comment from the student onto their own submission. Canvas threads
// it into the same submission_comments list that teacher feedback uses, so it
// shows up alongside feedback on the next detail fetch.
export async function postSubmissionComment(
  token: string,
  courseId: number,
  assignmentId: number,
  text: string,
) {
  const res = await fetch(
    `https://${DOMAIN}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
    {
      method: 'PUT',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: { text_comment: text } }),
    }
  )
  if (!res.ok) throw new Error(`Canvas comment failed: ${res.status}`)
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

// Merge a rubric *definition* (from the assignment) with the student's
// *assessment* (from the submission). Iterates the definition so every
// criterion shows even when the work hasn't been graded against it yet —
// unlike fetchRecentSubmissions, which only surfaces assessed criteria.
function buildRubricFromDefinition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rubricDefs: any[],
  rubricAssessment: Record<string, { points?: number; comments?: string; rating_id?: string }> | null,
): RubricCriterionResult[] {
  return rubricDefs.map((def) => {
    const id = String(def?.id ?? '')
    const val = rubricAssessment?.[id] ?? null
    let ratingDescription: string | null = null
    if (val?.rating_id && Array.isArray(def?.ratings)) {
      const r = def.ratings.find((rr: { id?: unknown }) => String(rr?.id) === String(val.rating_id))
      if (r && typeof r.description === 'string') ratingDescription = r.description
    }
    return {
      id,
      description: typeof def?.description === 'string' ? def.description : null,
      longDescription: typeof def?.long_description === 'string' ? def.long_description : null,
      points: typeof val?.points === 'number' ? val.points : null,
      maxPoints: typeof def?.points === 'number' ? def.points : null,
      ratingDescription,
      comment: typeof val?.comments === 'string' && val.comments.trim() ? val.comments : null,
    } satisfies RubricCriterionResult
  })
}

// One student's submission for one assignment, plus the assignment's rubric.
// Canvas scopes /submissions/self to the authenticated user and their own
// enrollments, so arbitrary id guessing just yields a non-ok response here.
export async function fetchSubmissionDetail(
  token: string,
  courseId: number,
  assignmentId: number,
): Promise<SubmissionDetail | null> {
  const [subRes, asgRes] = await Promise.all([
    fetch(
      `https://${DOMAIN}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self?include[]=submission_comments&include[]=rubric_assessment`,
      { headers: headers(token) },
    ),
    fetch(
      `https://${DOMAIN}/api/v1/courses/${courseId}/assignments/${assignmentId}`,
      { headers: headers(token) },
    ),
  ])

  // The submission endpoint gates access: a non-ok response means the user
  // isn't enrolled or the ids are bogus. Fail closed.
  if (!subRes.ok) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (await subRes.json().catch(() => null)) as any
  if (!s || typeof s !== 'object') return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asg = asgRes.ok ? ((await asgRes.json().catch(() => null)) as any) : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAttachments = Array.isArray(s.attachments) ? (s.attachments as any[]) : []
  const attachments: SubmissionAttachment[] = rawAttachments
    .filter((a) => a && typeof a === 'object' && isSafeHttpUrl(a.url))
    .map((a) => ({
      id: (a.id as number | string | undefined) ?? String(a.url),
      displayName:
        (typeof a.display_name === 'string' && a.display_name) ||
        (typeof a.filename === 'string' && a.filename) ||
        'Attachment',
      url: String(a.url),
      contentType: typeof a.content_type === 'string' ? a.content_type : null,
      size: typeof a.size === 'number' ? a.size : null,
    }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawComments = Array.isArray(s.submission_comments) ? (s.submission_comments as any[]) : []
  const comments: SubmissionComment[] = rawComments
    .filter((c) => typeof c?.comment === 'string' && c.comment.trim() !== '')
    .map((c) => ({
      id: (c.id as number | string) ?? `${s.id}-${c.created_at ?? ''}`,
      author: typeof c.author_name === 'string' && c.author_name ? c.author_name : 'Teacher',
      text: c.comment as string,
      createdAt: typeof c.created_at === 'string' ? c.created_at : null,
    }))

  const rubricDefs = asg && Array.isArray(asg.rubric) ? asg.rubric : []
  const rubricAssessment = (s.rubric_assessment ?? null) as Record<
    string,
    { points?: number; comments?: string; rating_id?: string }
  > | null
  const rubric = buildRubricFromDefinition(rubricDefs, rubricAssessment)

  const workflow = typeof s.workflow_state === 'string' ? s.workflow_state : null

  return {
    submissionType: typeof s.submission_type === 'string' ? s.submission_type : null,
    body: typeof s.body === 'string' ? sanitizeHtml(s.body) : null,
    url: typeof s.url === 'string' && isSafeHttpUrl(s.url) ? s.url : null,
    attachments,
    submittedAt: typeof s.submitted_at === 'string' ? s.submitted_at : null,
    workflowState:
      workflow === 'submitted' || workflow === 'graded' || workflow === 'pending_review' || workflow === 'unsubmitted'
        ? workflow
        : null,
    attempt: typeof s.attempt === 'number' ? s.attempt : null,
    score: typeof s.score === 'number' ? s.score : null,
    grade: typeof s.grade === 'string' ? s.grade : null,
    pointsPossible: asg && typeof asg.points_possible === 'number' ? asg.points_possible : null,
    comments,
    rubric,
  }
}

export async function fetchCourseGradeBreakdown(
  token: string,
  courseId: number,
  useWeightsHint?: boolean,
): Promise<CourseGradeBreakdown | null> {
  // If the caller already knows apply_assignment_group_weights (passed down from the
  // Grades page), skip the extra /courses/:id round-trip.
  const groupsP = fetch(
    `https://${DOMAIN}/api/v1/courses/${courseId}/assignment_groups?include[]=assignments&include[]=submission&per_page=100`,
    { headers: headers(token) },
  )
  const courseP = useWeightsHint === undefined
    ? fetch(`https://${DOMAIN}/api/v1/courses/${courseId}`, { headers: headers(token) })
    : null

  const groupsRes = await groupsP
  if (!groupsRes.ok) return null
  const groupsJson = await groupsRes.json()
  if (!Array.isArray(groupsJson)) return null

  let useWeights: boolean
  if (useWeightsHint !== undefined) {
    useWeights = useWeightsHint
  } else {
    const courseRes = await courseP!
    const courseJson = courseRes.ok ? await courseRes.json() : null
    useWeights = courseJson?.apply_assignment_group_weights === true
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: AssignmentGroupSummary[] = groupsJson.map((g: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawAssignments = Array.isArray(g?.assignments) ? (g.assignments as any[]) : []
    const assignments: GradeAssignment[] = rawAssignments
      .filter((a) => {
        // Skip assignments that don't count toward the grade.
        if (a?.omit_from_final_grade === true) return false
        if (typeof a?.points_possible !== 'number' || a.points_possible <= 0) return false
        return true
      })
      .map((a) => {
        const sub = a?.submission as Record<string, unknown> | undefined
        const workflow = typeof sub?.workflow_state === 'string' ? sub.workflow_state : null
        const state =
          workflow === 'submitted' || workflow === 'graded' || workflow === 'pending_review' || workflow === 'unsubmitted'
            ? workflow
            : null
        return {
          id: a.id as number,
          name: typeof a.name === 'string' ? a.name : 'Untitled',
          score: typeof sub?.score === 'number' ? (sub.score as number) : null,
          pointsPossible: a.points_possible as number,
          state,
          htmlUrl: typeof a.html_url === 'string' ? (a.html_url as string) : null,
        }
      })

    const rules = (g?.rules ?? {}) as { drop_lowest?: number; drop_highest?: number }
    return {
      id: g.id as number,
      name: typeof g.name === 'string' ? g.name : 'Group',
      weight: typeof g.group_weight === 'number' ? g.group_weight : 0,
      dropLowest: typeof rules.drop_lowest === 'number' ? rules.drop_lowest : 0,
      dropHighest: typeof rules.drop_highest === 'number' ? rules.drop_highest : 0,
      assignments,
    }
  })

  return { courseId, useWeights, groups }
}

export async function fetchGrades(token: string): Promise<CourseGrade[]> {
  return (await fetchGradesAndCourses(token)).grades
}

// Single Canvas /courses call serves both the Grades tab and downstream callers
// (recent submissions, breakdown weighting hint) — avoids issuing the same
// /courses?enrollment_state=active query twice.
export async function fetchGradesAndCourses(
  token: string,
): Promise<{ grades: CourseGrade[]; courses: CanvasCourse[] }> {
  const res = await fetch(
    `https://${DOMAIN}/api/v1/courses?enrollment_type=student&enrollment_state=active&include[]=total_scores&per_page=100`,
    { headers: headers(token) }
  )
  if (!res.ok) return { grades: [], courses: [] }
  const data = await res.json()
  if (!Array.isArray(data)) return { grades: [], courses: [] }

  const grades: CourseGrade[] = []
  const courses: CanvasCourse[] = []
  for (const course of data) {
    courses.push({ id: course.id, name: course.name, course_code: course.course_code })
    const enrollment = Array.isArray(course.enrollments) ? course.enrollments[0] : null
    const score = enrollment?.computed_current_score ?? null
    const grade = enrollment?.computed_current_grade ?? null
    if (score !== null || grade !== null) {
      grades.push({
        courseId: course.id,
        courseName: course.name,
        courseCode: course.course_code,
        currentScore: typeof score === 'number' ? score : null,
        currentGrade: typeof grade === 'string' ? grade : null,
        useWeights: course.apply_assignment_group_weights === true,
      })
    }
  }
  return { grades, courses }
}
