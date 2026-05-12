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
