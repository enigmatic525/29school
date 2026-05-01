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
  return res.json() as Promise<{ name: string; primary_email: string }>
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
  return data
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
