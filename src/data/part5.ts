// ─────────────────────────────────────────────────────────────────────────────
// PARTS V/VI + CLOSING · findings F18–F21, F25–F26
// Sources (real analysis exports, compact derivations in src/data/cultural/):
//   reality_anchor.json          F18 real-vs-generated homogeneity + distances
//   base_rates_wedding.json      F18 real Commons photo attribute base rates (n=20/cell)
//   reality_attribution.json     F18 photo credits (Wikimedia Commons manifests)
//   distortion_summary.json      F19 toward-default vs toward-reality, per model + pooled
//   load_conservation.json       F21 control-qualifier load deltas (load_bits.json)
//   ../audits/*.json             F25 six cached auditor reports (sd3.5-large validation)
// F26 numbers from vqa_agreement.json / annotator_hedge_audit.json / promoted_spotcheck.json
// ─────────────────────────────────────────────────────────────────────────────
import realityAnchor from './cultural/reality_anchor.json'
import baseRatesWedding from './cultural/base_rates_wedding.json'
import attribution from './cultural/reality_attribution.json'
import distortion from './cultural/distortion_summary.json'
import loadCons from './cultural/load_conservation.json'
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

export const BASE_RATES = baseRatesWedding as unknown as Record<
  string,
  Record<string, { majority: string; share: number; n: number }>
>

export interface Attribution { file: string; author: string; license: string; url: string }
export const REAL_PHOTOS = attribution as unknown as Record<string, Attribution[]>

// hero backwards case: generated wedding×NG assumes outdoors 96% (attribute_summary),
// real Nigerian weddings are 75% indoors (base_rates_wedding, qwen3_vl, n=20)
export const BACKWARDS = {
  attribute: 'setting',
  generatedValue: 'outdoors',
  generatedShare: 0.96,
  realValue: BASE_RATES.wedding_nigeria.U01.majority,
  realShare: BASE_RATES.wedding_nigeria.U01.share,
}

/* F19: direction of error (pooled tendency only; per-question 0/31 significant on SD 2.1) */
export const DISTORTION = distortion as unknown as {
  sd21: { toward_default: number; toward_reality: number; n_questions_tested: number; n_significant_p05: number }
  models: Record<string, { toward_default: number; toward_reality: number }>
  pooled: { toward_default: number; toward_reality: number; ratio: number }
  caveat: string
}

/* F21: load conservation: neutral qualifiers recruit load like country names */
export const LOAD_CONS = loadCons as unknown as Record<
  string,
  {
    default_load_bits: number
    cultural_ladder_delta_bits: number
    control_delta_bits: Record<string, number>
    mean_control_delta_bits: number
  }
>

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

/* F26: the instrument is audited (vqa_agreement.json, annotator_hedge_audit.json,
   promoted_spotcheck.json: key numbers, see those files for full tables) */
export const INSTRUMENT_AUDIT = {
  gate: 'Gwet’s AC1 ≥ 0.4 (Cohen’s κ kept as legacy reference)',
  perQuestionKappa: { U01: 0.7475, U03: 0.7659, U04: 0.8072, U06: 0.4786, U09: 0.0818 },
  hedgeFinding:
    'The second annotator hedges far more on geographic-placement questions (urban/rural, continent, weather) but hedges LESS than the primary on attire and cultural-marker questions (headwear, outfit color, dancing, food). The trigger worry, alignment training softening regional descriptors, was narrower than feared.',
  promotedSpotcheck: { total: 109, verdict: 'every cell promoted by the κ→AC1 gate fix individually spot-checked' },
  verification: { batch: 0.952, perItem: 0.991 },
}
