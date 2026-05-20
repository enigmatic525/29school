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
  // submission state, lifted from the included submission object
  submissionState?: 'submitted' | 'graded' | 'pending_review' | 'unsubmitted' | null
  submittedAt?: string | null
  isLate?: boolean
  isMissing?: boolean
  score?: number | null
}

// An assignment that accepts no submission at all — Canvas's 'none'/'not_graded'
// types, or no submission types listed. There is nothing for the student to
// turn in, so it should never be flagged "missing" and instead auto-completes
// once its due date has passed.
export function hasNoSubmission(a: Pick<CanvasAssignment, 'submission_types'>): boolean {
  const types = a.submission_types ?? []
  return types.length === 0 || types.every((t) => t === 'none' || t === 'not_graded')
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

export interface CourseGrade {
  courseId: number
  courseName: string
  courseCode: string
  currentScore: number | null
  currentGrade: string | null
  // Mirrors Canvas's apply_assignment_group_weights — lets the What-If calculator
  // skip a per-course Canvas fetch.
  useWeights: boolean
}

export interface GradeAssignment {
  id: number
  name: string
  score: number | null
  pointsPossible: number
  // 'graded' means score is the real teacher-entered score; 'unsubmitted'/null means
  // it's hypothetical-only territory in the calculator.
  state: 'graded' | 'submitted' | 'pending_review' | 'unsubmitted' | null
  htmlUrl: string | null
}

export interface AssignmentGroupSummary {
  id: number
  name: string
  weight: number
  dropLowest: number
  dropHighest: number
  assignments: GradeAssignment[]
}

export interface CourseGradeBreakdown {
  courseId: number
  useWeights: boolean
  groups: AssignmentGroupSummary[]
}

export interface SubmissionAttachment {
  id: number | string
  displayName: string
  // Canvas-signed download URL — validated as http(s) at the fetch boundary.
  url: string
  contentType: string | null
  size: number | null
}

// The student's own submission for one assignment, plus the assignment's
// rubric. Powers the expanded AssignmentDetail view.
export interface SubmissionDetail {
  // 'online_text_entry' | 'online_url' | 'online_upload' | 'discussion_topic' |
  // 'media_recording' | 'on_paper' | etc. — null when nothing submitted yet.
  submissionType: string | null
  // Sanitised HTML for text entries.
  body: string | null
  // For url entries.
  url: string | null
  attachments: SubmissionAttachment[]
  submittedAt: string | null
  workflowState: 'submitted' | 'graded' | 'pending_review' | 'unsubmitted' | null
  // Canvas attempt counter — >1 means the assignment was resubmitted.
  attempt: number | null
  score: number | null
  grade: string | null
  pointsPossible: number | null
  comments: SubmissionComment[]
  // Every rubric criterion the assignment defines, merged with the student's
  // assessed points/rating where graded. Empty when the assignment has no rubric.
  rubric: RubricCriterionResult[]
}
