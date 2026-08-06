// ─────────────────────────────────────────────────────────────────────────────
// PART VI · the remedy, at the breadth its evidence has
// Source: scripts/phase4_frontend_export/export_remedy.py → cultural/remedy.json
//
// Review 05 named the page's structural problem: the diagnosis covers 378
// (model, prompt) pairs, the remedy was argued from 10 measured ladders, and the
// title makes a claim about the remedy. These two blocks close most of that gap
// without generating a single image.
//
//   debt   S1 · how many attributes each pair settles unasked, at five gates
//   steer  S2 · per-attribute flip rates pooled over every ladder, Wilson CIs
//
// INSTRUMENT: all seven models here come from the single-annotator `gemma4`
// tables. SD 2.1's two-annotator table is NOT used — mixing the two is the error
// review 01 R2 caught in scene 15.
// ─────────────────────────────────────────────────────────────────────────────
import raw from './cultural/remedy.json'
import type { ModelId } from './modelContext'
import type { Sit, Code } from './part1'

/** [question_id, assumed_value, consistency × 100] */
export type DebtRow = [string, string, number]

interface Remedy {
  debt: Record<string, Record<string, DebtRow[]>>
  debt_summary: {
    per_model: Record<string, { median: number; min: number; max: number; mean: number; n_cells: number }>
    thresholds: Record<string, { median: number; mean: number; max: number; n_pairs: number }>
  }
  thresholds: number[]
  ladder_cells: Record<string, string[]>
  deepest_ladder: number
  steer: {
    rows: { q: string; all: Wilson; untargeted: Wilson }[]
    /** the cells that actually contribute attribute-level data. Six of SD 2.1's eight
        ladders ship an EMPTY `switches` dict, so this is 2, not 10. Derived by the
        export so no scene can print the ladder count as if it were the evidence. */
    cells: string[]
    n_cells: number
    per_model: Record<string, { all: { k: number; n: number }; untargeted: { k: number; n: number } }>
  }
}
export interface Wilson { k: number; n: number; lo: number; hi: number }

const R = raw as unknown as Remedy

export const THRESHOLDS = R.thresholds
export const DEEPEST_LADDER = R.deepest_ladder
export const DEBT_SUMMARY = R.debt_summary
export const LADDER_CELLS = R.ladder_cells

export const cellKey = (sit: Sit, code: Code | 'default') => `${sit}_${code}`

/** every attribute this pair settled at ≥0.6, most-consistent first */
export const debtRows = (m: ModelId, key: string): DebtRow[] => R.debt[m]?.[key] ?? []

/** the count at a given gate — derived from the same list the hover renders, so the
    number and the list can never disagree */
export const debtAt = (m: ModelId, key: string, thr: number) =>
  debtRows(m, key).filter((r) => r[2] >= Math.round(thr * 100)).length

export const DEBT_MODELS = Object.keys(R.debt) as ModelId[]
export const DEBT_CELLS = Object.keys(R.debt.sd21 ?? {})

/** the consistency gate that makes an assumption "headline" — CONSISTENCY_HEADLINE
    in phase3_analysis/{cultural,cross_model}_attribute_tables.py. The prevalence
    table counts headline-tier cards, so the same gate reproduces its cell list. */
export const HEADLINE_GATE = 80

/* ── what does not belong in the prevalence table ──────────────────────────────
   Three ways a (question, answer) row can carry a count without being an
   assumption the model made:

   1. THE PROMPT ENTAILS IT. Asking for a family and being shown two generations
      is not a decision made unasked. This is export_remedy.py's own CIRCULAR /
      CIRCULAR_ALL table, ported — it already applies it to the debt list, and
      build_prevalence deliberately does not, on the grounds that prevalence is a
      distribution. That holds for the *statistic*; it does not hold for a table a
      reader scans row by row for things the model believes.
      Flattened across situations, because a matrix row has no situation. Exact
      here: no pair in the table is circular in one situation and meaningful in
      another (B2=table, F2=coffin and W1=white were deliberately left out of it).

   2. IT IS A NON-ANSWER. "unclear" and "n-a" are the battery's abstentions, and
      uiv2's open-answer hygiene already drops them for the same stated reason —
      missing data presented as a finding is worse than no finding.

   3. NOBODY IS IN THE PICTURE. "no headwear" is vacuous in a still life. Handled
      per cell rather than per row, below, because unlike 1 and 2 it is true of
      some of a row's prompts and not others. */
const CIRCULAR = new Set([
  'U05|wedding', 'U13|dress', 'U13|wedding', 'U13|veil',
  'U14|wedding', 'U14|bride', 'U14|groom', 'U14|dressed',
  'U13|plate', 'U13|plates', 'U13|bowl', 'U13|bowls', 'U13|food',
  'U14|breakfast', 'U14|table', 'U14|dishes',
  'FA2|yes', 'U14|family',
  'U13|coffin',
  'C1|celebration', 'U14|gathered',
  'U13|desks', 'U14|desks',
  'U05|clothing', 'U05|attire', 'U13|clothing',
])
const NON_ANSWER = new Set(['unclear', 'n-a', 'n/a'])

/** does this (question, answer) belong in a list of things the model assumed? */
export const isAssumption = (q: string, v: string) =>
  !CIRCULAR.has(`${q}|${v.toLowerCase()}`) && !NON_ANSWER.has(v.toLowerCase())

/** questions that describe the people in the picture */
const PERSON_Q = new Set(['U05b', 'U06'])
const settled = (m: ModelId, key: string, q: string, v: string) =>
  (R.debt[m]?.[key] ?? []).some((r) => r[0] === q && r[1] === v && r[2] >= HEADLINE_GATE)

/** Which prompts actually fired one row of the prevalence matrix, for one model.
    The matrix ships counts only, so without this the reader is told "9 of 54" and
    given no way to ask *which* 9 — the debt block is the same headline record at
    full per-cell fidelity, so the list comes from there rather than from a second
    export.

    Reproduces `by_model` exactly for every non-circular non-zero pair in the
    shipped matrix, minus `held`: prompts that settled "0 people" are not evidence
    about headwear or clothing, and half of U06=no's cells are peopleless
    breakfasts. They are reported, not silently dropped, because the count beside
    them is the export's and still includes them. */
export function firingCells(m: ModelId, q: string, v: string): { cells: string[]; held: number } {
  const all = Object.entries(R.debt[m] ?? {})
    .filter(([, rows]) => rows.some((r) => r[0] === q && r[1] === v && r[2] >= HEADLINE_GATE))
    .map(([key]) => key)
  if (!PERSON_Q.has(q)) return { cells: all, held: 0 }
  const cells = all.filter((key) => !settled(m, key, 'U04', '0'))
  return { cells, held: all.length - cells.length }
}

/** every (model, cell) count at one gate, for the strip plot and the median tick */
export function debtSpread(m: ModelId, thr: number) {
  const cells = R.debt[m] ?? {}
  return Object.entries(cells).map(([key, rows]) => ({
    key,
    n: rows.filter((r) => r[2] >= Math.round(thr * 100)).length,
    hasLadder: (R.ladder_cells[m] ?? []).includes(key),
  }))
}

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

/* ── S2 · steerability ─────────────────────────────────────────────────────── */

export type Bucket = 'all' | 'untargeted'
export const STEER_ROWS = R.steer.rows
export const STEER_PER_MODEL = R.steer.per_model
export const STEER_CELLS = R.steer.cells
export const STEER_N_CELLS = R.steer.n_cells

/** pooled flip rate over every ladder observation in the study */
export const steerTotal = (bucket: Bucket) =>
  STEER_ROWS.reduce(
    (acc, r) => ({ k: acc.k + r[bucket].k, n: acc.n + r[bucket].n }),
    { k: 0, n: 0 }
  )

/** the attributes that never moved once, in any ladder, on any model */
export const neverMoved = (bucket: Bucket) => STEER_ROWS.filter((r) => r[bucket].n > 0 && r[bucket].k === 0)

/* ── S3 · the consensus prior, chance-corrected ────────────────────────────── */

export interface Consensus {
  n_slots: number
  hist: Record<string, number>
  per_model: Record<string, { own: number; shared: number; added: number; alone: number }>
  contradictory: number
  contradictory_examples: { sit: string; code: string; q: string; values: Record<string, number> }[]
  ac1: {
    weighted: number
    n_questions: number
    per_question: Record<string, { ac1: number; items: number; k: number }>
    single_valued: Record<string, number>
  }
  null: {
    n_perm: number
    unanimous: NullTest
    at_least_4: NullTest
  }
}
export interface NullTest { observed: number; mean: number; lo: number; hi: number; p: number; excess: number }

export const CONSENSUS = (R as unknown as { consensus: Consensus }).consensus

/* ── S6 · what the ecosystem shares, not just how much ─────────────────────── */

export interface PrevRow { q: string; v: string; n: number }
export const PREVALENCE = (R as unknown as {
  prevalence: {
    per_model: Record<string, PrevRow[]>
    matrix: { q: string; v: string; by_model: Record<string, number> }[]
    n_cells: number
  }
}).prevalence

/* ── S5 · the seed-shopping bound ──────────────────────────────────────────── */

export interface ShopCell {
  gen_50: number
  n_real: number | null
  real_all: number | null
  gen_at_20?: number
  real_at_20?: number
  gap_at_20?: number
  share_closed?: number
}
export const SEEDSHOP = (R as unknown as {
  seedshop: {
    k_compare: number
    cells: Record<string, ShopCell>
    gen_curves: Record<string, number[]>
    real_curves: Record<string, number[]>
    summary: {
      n_cells: number
      n_compared: number
      median_gap: number
      mean_gap: number
      n_generated_more_diverse: number
      median_share_closed: number
      min_share_closed: number
      max_share_closed: number
    }
  }
}).seedshop

/** curve value at subset size k (curves start at k = 2) */
export const atK = (curve: number[] | undefined, k: number) => curve?.[k - 2]

/* ── F-a / F-b · the phrasing of the fix ───────────────────────────────────── */

export interface Keying {
  dist: number; lo: number; hi: number; intraset: number; n: number; separated: boolean
}
export const PHRASING = (R as unknown as {
  phrasing: {
    form: Record<string, {
      default_bits: number; cultural: number; controls: number
      congruent: Record<string, number>; negation: Record<string, number>
    }>
    keying: Record<string, Record<string, Keying>>
  }
}).phrasing

/* ── the prompt clinic ─────────────────────────────────────────────────────── */

export interface Measured {
  depth: string
  prompt: string
  clauses: string[]
  flipped: { q: string; before: string; after: string }[]
  held: { q: string; value: string }[]
  load: [number | null, number | null]
  intraset: [number | null, number | null]
}
const CLINIC = (R as unknown as {
  clinic: { clauses: Record<string, string>; measured: Record<string, Measured> }
}).clinic

/** The counter-clause for an attribute, or null if nobody ever wrote one.
    Copied from audit.py's COUNTER_CLAUSE — an attribute with no entry was never
    tested for steerability, so the clinic must offer no checkbox rather than
    improvise wording that would not be comparable to the measured rungs. */
export const clauseFor = (q: string, v: string): string | null => CLINIC.clauses[`${q}|${v}`] ?? null

/** what the real ladder did for this (model, cell) — null where none was run */
export const measuredFor = (m: ModelId, key: string): Measured | null =>
  CLINIC.measured[`${m}|${key}`] ?? null

/** pooled flip record for one attribute, used to sort the clinic stubborn-first */
export const steerFor = (q: string) => STEER_ROWS.find((r) => r.q === q)?.untargeted ?? null

/* ── S2b · Job A's factorial — the designed version of S2 ──────────────────── */
/* S2 pools rungs of different depths, targeting different attribute sets. Job A
   removes both: one clause, one attribute, depth exactly 1, the SAME conditions
   on all seven models, over the ground set (assumptions every model independently
   names with the same value). It is the measurement 16·b's own TierNote asked for. */

export interface FactRow {
  qid: string
  question: string
  clause: string
  assumed_value: string
  direction: 'add' | 'constrain'
  /** U09 (day/night) is a lighting property, not a cultural assumption. It is not part
      of the law — it is the positive control, and the only attribute spanning more than
      one situation, which is what keeps attribute and cell separable. */
  control: boolean
  situations: string[]
  /** how many models this attribute ran on: 7 for the round-1 set, 6 for U11/U04
      (Flux's round-2 slice needs the remote card and was not run) */
  n_models: number
  n_prompts: number
  n_conditions: number
  n_flipped: number
  flip_rate: number
  ci: [number, number]
  model_min: number
  model_max: number
  model_spread: number
  mean_delta: number
}
export const FACTORIAL = (R as unknown as {
  factorial: {
    models: ModelId[]
    /** the cultural attributes — the law is stated on these (C4 all-7, U11/U04 six models) */
    rows: FactRow[]
    /** the non-cultural positive control, reported beside the law, never inside it */
    control: FactRow[]
    /** FA2, withdrawn as cultural evidence (near-entailment of the noun) — shown as
        its own labelled exhibit, never as a row of the law */
    retracted: FactRow[]
    headline: {
      attributes: string[]
      control_attributes: string[]
      n_flipped: number
      n_conditions: number
      flip_rate: number
      ci: [number, number]
      /** true when every cultural attribute lives in one situation, so removing the
          control would leave attribute and cell perfectly confounded */
      control_carries_the_design: boolean
    }
    pilot_only: FactRow[]
    per_model: Record<string, Record<string, { k: number; n: number; rate: number }>>
    /** permutation test: which factor's grouping explains flipping? (all-7 trio) */
    factor: Record<'attribute' | 'model' | 'cell', { spread: number; p: number }>
    /** the same test on the six models that also ran U11/U04 — the version with the
        cultural constraining cases in it */
    factor_r2: Record<'attribute' | 'model' | 'cell', { spread: number; p: number }>
    /** factor_r2 with the retracted FA2 removed: the attribute factor must survive here */
    factor_r2_no_fa2: Record<'attribute' | 'model' | 'cell', { spread: number; p: number }>
    cell_consistency: Record<string, {
      n_cells: number
      unanimous_cells: number
      unanimous_share: number
      held_in_every_model: string[]
    }>
    collateral: {
      settled_gate: number
      depth: number
      n_conditions: number
      settled_untargeted: number
      moved: number
      rate: number
      ci: [number, number]
      by_model: Record<string, { moved: number; settled_untargeted: number; rate: number | null }>
    }
    /** verdicts in the factor_r2 test (six models × the conditions they all ran) */
    factor_r2_n: number
    /** models × prompts */
    n_conditions: number
    n_prompts: number
    n_perm: number
  }
}).factorial
