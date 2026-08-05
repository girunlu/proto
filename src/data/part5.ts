// ─────────────────────────────────────────────────────────────────────────────
// PARTS V/VI + CLOSING · findings F18–F21, F25–F26
// Sources (real analysis exports, compact derivations in src/data/cultural/):
//   reality_anchor.json          F18 real-vs-generated homogeneity + distances
//   ui_v2.json                   reality_attrs, for the questionnaire's own n
// Dropped 2026-07-31 (review B7): base_rates_wedding / reality_attribution /
//   load_conservation fed BASE_RATES, BACKWARDS, REAL_PHOTOS and LOAD_CONS, none of
//   which any scene rendered. The files stay on disk (load_conservation is wanted
//   for the planned remedy scenes) — only the imports are gone.
//   distortion_summary.json      F19 toward-default vs toward-reality, per model + pooled
//   ../audits/*.json             F25 six cached auditor reports (sd3.5-large validation)
// F26 numbers from vqa_agreement.json / annotator_hedge_audit.json / promoted_spotcheck.json
// ─────────────────────────────────────────────────────────────────────────────
import ui from './cultural/ui_v2.json'
import realityAnchor from './cultural/reality_anchor.json'
import distortion from './cultural/distortion_summary.json'
import remedy from './cultural/remedy.json'
import auditBirthday from './audits/sd3.5-large__a_birthday_party.json'
import auditFamilyJapan from './audits/sd3.5-large__a_family_gathering_in_japan.json'
import auditFuneralIndonesia from './audits/sd3.5-large__a_funeral_in_indonesia.json'
import auditGraduationMexico from './audits/sd3.5-large__a_graduation_ceremony_in_mexico.json'
import auditSchoolEgypt from './audits/sd3.5-large__a_school_in_egypt.json'
import auditWeddingGermany from './audits/sd3.5-large__a_wedding_in_germany.json'

/* F18: reality anchor */
export interface RealityCell {
  n_real: number
  generated_intraset_sim: number
  real_intraset_sim?: { value: number; ci_lo: number; ci_hi: number }
  real_vendi_score?: number
  generated_vendi_score: number
  generated_vs_real_distance?: { value: number; ci_lo: number; ci_hi: number }
}
export const REALITY_ANCHOR = realityAnchor.results as unknown as Record<string, Record<string, RealityCell>>

/* How many Commons photographs actually entered the measurement, summed from the
   export rather than typed. The page used to say "about 4,400" (closer to the
   ~4,700 collected before relevance filtering) and "roughly 20 per cell". */
const REAL_CELL_COUNTS = Object.values(REALITY_ANCHOR).flatMap((cs) =>
  Object.entries(cs)
    .filter(([code, v]) => !code.startsWith('_') && code !== 'default' && (v?.n_real ?? 0) > 0)
    .map(([, v]) => v.n_real)
)
export const REAL_PHOTOS_N = REAL_CELL_COUNTS.reduce((a, b) => a + b, 0)
export const REAL_CELLS_N = REAL_CELL_COUNTS.length
export const REAL_PER_CELL = Math.round(REAL_PHOTOS_N / Math.max(1, REAL_CELLS_N))

/* Two different n's, and the page used to print the bigger one for both.
   REAL_PHOTOS_N is the geometry: every photograph that entered a distance or
   homogeneity measurement. The questionnaire originally ran on a capped subsample
   (≤20 per cell); the cap was lifted 2026-08-02 (Job 2, ~3× n), so the two counts
   now cover the same collected set. Summed from the export, not typed. */
export const REAL_QUESTIONNAIRE_N = Object.values(
  ui.reality_attrs as Record<string, { n_real: number }[]>
).reduce((sum, rows) => sum + Math.max(0, ...rows.map((r) => r.n_real)), 0)

/* F19: direction of error (pooled tendency only; per-question 0/31 significant on SD 2.1).
   `sd21` is the two-annotator AC1-gated table; `sd21_matched` is the same model scored by
   gemma4 alone, which is the instrument all six cross-models were scored with. The page must
   compare across `sd21_matched` — reading the two-annotator row against six single-annotator
   ones was what made SD 2.1 look even (51.7%) when matched it is 60.9%, mid-pack. */
interface DistortionRow {
  toward_default: number
  toward_reality: number
  n_questions_tested: number
  n_significant_p05: number
  annotator: string
}
export const DISTORTION = distortion as unknown as {
  sd21: DistortionRow
  sd21_matched: DistortionRow
  models: Record<string, { toward_default: number; toward_reality: number }>
  pooled: { toward_default: number; toward_reality: number; ratio: number }
  pooled_mixed: { toward_default: number; toward_reality: number; ratio: number }
  caveat: string
}

/* F25: cached auditor reports (static demo, no live inference) */
export interface AuditAssumption {
  question_id: string
  question: string
  assumed_value: string
  consistency: number
  tier: string
  steerable?: boolean
  steerability_detail?: { counter_prompt: string; consistency_after_counter_spec: number; majority_value_after: string; steerable: boolean } | null
}
export interface AuditReport {
  prompt: string
  model: string
  situation: string | null
  country: string | null
  n_seeds: number
  named_assumptions: AuditAssumption[]
}
export const AUDITS: { id: string; novel: boolean; report: AuditReport }[] = [
  { id: 'a birthday party', novel: true, report: auditBirthday as unknown as AuditReport },
  { id: 'a graduation ceremony in Mexico', novel: true, report: auditGraduationMexico as unknown as AuditReport },
  { id: 'a family gathering in Japan', novel: false, report: auditFamilyJapan as unknown as AuditReport },
  { id: 'a funeral in Indonesia', novel: false, report: auditFuneralIndonesia as unknown as AuditReport },
  { id: 'a school in Egypt', novel: false, report: auditSchoolEgypt as unknown as AuditReport },
  { id: 'a wedding in Germany', novel: false, report: auditWeddingGermany as unknown as AuditReport },
]

/* F26: the instrument is audited. Rebuilt 2026-07-31 when gemma4 became the page's
   only annotator. The old audit was a two-annotator agreement table; with one
   annotator the question changes from "do they agree?" to "does it actually look?" —
   answered by remedy.json's `instrument` block, which is Job A's pilot: same
   annotator, same questions, same cells, one clause different in the prompt.
   Summed from the export, not typed. */
const INST = remedy.instrument as {
  annotator: string
  n_conditions: number
  n_seeds: number
  n_moved: number
  n_held: number
  moved: { cell: string; q: string; v: string; clause: string; before: number; after: number }[]
  held: { cell: string; q: string; v: string; clause: string; before: number; after: number }[]
}
export const INSTRUMENT_AUDIT = {
  ...INST,
  gate: 'consistency ≥ 0.8 across 50 seeds (headline) / ≥ 0.6 (secondary)',
  promotedSpotcheck: { total: 109, verdict: 'every cell promoted by the κ→AC1 gate fix individually spot-checked' },
  verification: { batch: 0.952, perItem: 0.991 },
}
