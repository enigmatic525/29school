import type { AssignmentGroupSummary, CourseGradeBreakdown } from './canvas-shared'

// ─── Grade math ──────────────────────────────────────────────────────────────
// Shared by the What-If calculator (GradesView) and the sample generator below,
// so the two can never drift apart.

// Per-group percent: sum(score) / sum(points_possible). Ungraded assignments
// (score === null) don't contribute on either side, so adding a hypothetical
// score to one of them counts it in. Drop-lowest/highest rules are NOT applied.
export function groupPercent(
  group: AssignmentGroupSummary,
  overrides: Record<number, number | null>,
): { pct: number | null; counted: number } {
  let earned = 0
  let possible = 0
  let counted = 0
  for (const a of group.assignments) {
    const override = overrides[a.id]
    const score = override !== undefined ? override : a.score
    if (score === null || score === undefined) continue
    earned += score
    possible += a.pointsPossible
    counted += 1
  }
  if (possible <= 0) return { pct: null, counted: 0 }
  return { pct: (earned / possible) * 100, counted }
}

// The course total Canvas would show given a set of score overrides. Weighted
// courses average each group's percent by its weight; unweighted courses pool
// all points. Monotonic non-decreasing in every override — raising any score
// can only raise (or hold) the total — which is what makes the binary search
// in generateSampleScores valid.
export function projectedTotal(
  breakdown: CourseGradeBreakdown,
  overrides: Record<number, number | null>,
): number | null {
  if (breakdown.useWeights) {
    let weightedSum = 0
    let weightUsed = 0
    for (const g of breakdown.groups) {
      const { pct } = groupPercent(g, overrides)
      if (pct === null) continue
      weightedSum += pct * g.weight
      weightUsed += g.weight
    }
    if (weightUsed <= 0) return null
    return weightedSum / weightUsed
  }
  let earned = 0
  let possible = 0
  for (const g of breakdown.groups) {
    for (const a of g.assignments) {
      const override = overrides[a.id]
      const score = override !== undefined ? override : a.score
      if (score === null || score === undefined) continue
      earned += score
      possible += a.pointsPossible
    }
  }
  return possible > 0 ? (earned / possible) * 100 : null
}

// ─── Sample generator ────────────────────────────────────────────────────────

// A source of randomness in [0, 1). Injected (rather than calling Math.random
// directly) so tests can feed a deterministic sequence.
export type Rng = () => number

export type SampleResult =
  | { ok: true; scores: Map<number, number> }
  // 'impossible': even full marks on everything left can't reach the target.
  // 'nothing-to-generate': no ungraded assignments to fill in.
  | { ok: false; reason: 'impossible' | 'nothing-to-generate' }

// An ungraded assignment's score is generated as a whole number, so it can't
// exceed floor(pointsPossible) — e.g. a 2.5-point assignment tops out at 2.
function intCap(a: { pointsPossible: number }): number {
  return Math.floor(a.pointsPossible)
}

// Fisher-Yates shuffle of [0, n) driven by the injected RNG.
function shuffledIndices(n: number, rng: Rng): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

// Split integer `total` into caps.length whole-number parts where 0 ≤ part i ≤
// caps[i] and the parts sum to `total`. Caller must guarantee caps are integers
// and 0 ≤ total ≤ sum(caps).
//
// Walking the assignments in random order, each one takes a random integer in
// [lo, hi] where lo is the least it must take so the rest can still absorb
// what's left, and hi is the most it can take. Because those bounds always
// leave a feasible remainder, the walk can never paint itself into a corner.
export function randomPartition(total: number, caps: number[], rng: Rng): number[] {
  const result = new Array<number>(caps.length).fill(0)
  let remaining = total
  let capsLeft = caps.reduce((s, c) => s + c, 0)
  for (const k of shuffledIndices(caps.length, rng)) {
    capsLeft -= caps[k] // sum of caps of assignments still unassigned after k
    const lo = Math.max(0, remaining - capsLeft)
    const hi = Math.min(caps[k], remaining)
    const val = lo + Math.floor(rng() * (hi - lo + 1)) // random integer in [lo, hi]
    result[k] = val
    remaining -= val
  }
  return result
}

// Whole-number scores can leave the projected total a point or two off target.
// Walk it back up to the cutoff: each step +1's whichever assignment moves the
// total the *least*, so we settle just above the target instead of overshooting.
// Guaranteed to terminate — feasibility was already checked against full integer
// caps, so there is always enough headroom to reach the target.
function balanceUp(
  breakdown: CourseGradeBreakdown,
  scores: Record<number, number>,
  caps: Map<number, number>,
  targetPct: number,
): void {
  const ids = [...caps.keys()]
  for (let guard = 0; guard < 10000; guard++) {
    const current = projectedTotal(breakdown, scores)
    if (current !== null && current >= targetPct) return
    let bestId: number | null = null
    let bestDelta = Infinity
    for (const id of ids) {
      if (scores[id] >= (caps.get(id) ?? 0)) continue // no headroom left
      scores[id] += 1
      const bumped = projectedTotal(breakdown, scores)
      scores[id] -= 1
      if (bumped === null) continue
      const delta = bumped - (current ?? 0)
      if (delta > 0 && delta < bestDelta) {
        bestDelta = delta
        bestId = id
      }
    }
    if (bestId === null) return // nothing left can move the needle
    scores[bestId] += 1
  }
}

// Generate a plausible set of whole-number scores for every ungraded assignment
// such that the projected course total lands around (and at/above) `targetPct`.
//
// Three layers:
//   1. Binary-search a uniform fraction p ∈ [0,1] so that giving every remaining
//      assignment p·pointsPossible hits the target. This sizes each *group's*
//      point pool. Valid because projectedTotal is monotonic in p.
//   2. Within each group, randomly partition that pool into whole numbers.
//   3. Balance up: integer rounding can land a touch under the cutoff, so nudge
//      the total back over it (see balanceUp).
export function generateSampleScores(
  breakdown: CourseGradeBreakdown,
  targetPct: number,
  rng: Rng = Math.random,
): SampleResult {
  // An assignment is "remaining" if it has no score yet. Zero-point assignments
  // can't move the total, so leave them untouched.
  const isRemaining = (a: { score: number | null; pointsPossible: number }) =>
    a.score === null && a.pointsPossible > 0

  const hasRemaining = breakdown.groups.some((g) => g.assignments.some(isRemaining))
  if (!hasRemaining) return { ok: false, reason: 'nothing-to-generate' }

  // Best case under the whole-number rule: full integer marks everywhere.
  const maxScores: Record<number, number> = {}
  for (const g of breakdown.groups) {
    for (const a of g.assignments) {
      if (isRemaining(a)) maxScores[a.id] = intCap(a)
    }
  }
  const maxAchievable = projectedTotal(breakdown, maxScores)
  if (maxAchievable === null || maxAchievable < targetPct) {
    return { ok: false, reason: 'impossible' }
  }

  // Layer 1 — binary search the uniform fraction p that puts the (real-valued)
  // projected total on target. Used only to size each group's point pool.
  const uniformScores = (p: number): Record<number, number> => {
    const o: Record<number, number> = {}
    for (const g of breakdown.groups) {
      for (const a of g.assignments) {
        if (isRemaining(a)) o[a.id] = p * a.pointsPossible
      }
    }
    return o
  }
  let lo = 0
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const total = projectedTotal(breakdown, uniformScores(mid))
    if (total !== null && total >= targetPct) hi = mid
    else lo = mid
  }
  const p = hi

  // Layer 2 — per group, partition the pool into whole numbers.
  const scores: Record<number, number> = {}
  const caps = new Map<number, number>() // assignment id -> integer cap, for balanceUp
  for (const g of breakdown.groups) {
    const groupRemaining = g.assignments.filter(isRemaining)
    if (groupRemaining.length === 0) continue
    const groupCaps = groupRemaining.map(intCap)
    const capSum = groupCaps.reduce((s, c) => s + c, 0)
    const realPool = p * groupRemaining.reduce((s, a) => s + a.pointsPossible, 0)
    const pool = Math.min(capSum, Math.max(0, Math.round(realPool)))
    const parts = randomPartition(pool, groupCaps, rng)
    groupRemaining.forEach((a, i) => {
      scores[a.id] = parts[i]
      caps.set(a.id, groupCaps[i])
    })
  }

  // Layer 3 — nudge the whole-number total up to the cutoff.
  balanceUp(breakdown, scores, caps, targetPct)

  return { ok: true, scores: new Map(Object.entries(scores).map(([k, v]) => [Number(k), v])) }
}
