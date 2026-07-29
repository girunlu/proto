// ─────────────────────────────────────────────────────────────────────────────
// PART II: THE MECHANISM · findings F9–F13
// Sources (all real analysis exports, copied into src/data/cultural/):
//   lockup_curve.json                F9  24 swap directions × 5 steps, 12 seeds/point
//   commitment_schedule.json         F10 89 logistic fits; H1/H2 hypotheses
//   cfg_distance.json                F11 distance-from-default per CFG 1/4/7/12/15
//   clip_matrix/*.json + clip_matrix/clip_matrix_statistics.json
//                                    F12 9×9 text vs image matrices, Mantel r per situation
//   native_text_mantel.json          F12 cross-model native-encoder Mantel (2/36)
//   laion_homogeneity_inheritance.json F13 retrieval-neighborhood vs output homogeneity
// ─────────────────────────────────────────────────────────────────────────────
import lockup from './cultural/lockup_curve.json'
import commitment from './cultural/commitment_schedule.json'
import cfgDist from './cultural/cfg_distance.json'
import clipStats from './cultural/clip_matrix/clip_matrix_statistics.json'
import nativeMantel from './cultural/native_text_mantel.json'
import laion from './cultural/laion_homogeneity_inheritance.json'
import matrixWedding from './cultural/clip_matrix/wedding.json'
import matrixFuneral from './cultural/clip_matrix/funeral.json'
import { LOCKIN } from './research'
import type { Sit, Code } from './part1'

/* F9: timestep-swap lock-in */
export interface LockupPoint { step_idx: number; n_seeds: number; p_closer_B: number; ci_low: number; ci_high: number }
export interface LockupDirection {
  prompt_A: string; prompt_B: string; type: string
  curve: Record<string, LockupPoint>
}
export const LOCKUP = lockup.results as unknown as Record<string, LockupDirection>
export const LOCKUP_STEPS = [1, 5, 10, 15, 25]
export const stepKey = (s: number) => `step_${String(s).padStart(2, '0')}`
export const DIRECTIONS = Object.keys(LOCKUP)
export const HERO_DIRECTION = 'wedding_NG_to_US'
// logistic fit for the hero direction (lockin_logistic_fit.json via research.ts)
export const HERO_FIT = { step: LOCKIN.hero.step, ci: LOCKIN.hero.ci, steepness: LOCKIN.hero.steepness, totalSteps: 30 }

/* F10: coarse-to-fine commitment schedule (commitment_schedule.json hypotheses) */
export const COMMITMENT = {
  scene: { mean: commitment.hypotheses.H1_scene_before_texture.mean_crossing_scene, n: commitment.hypotheses.H1_scene_before_texture.n_scene },
  texture: { mean: commitment.hypotheses.H1_scene_before_texture.mean_crossing_texture, n: commitment.hypotheses.H1_scene_before_texture.n_texture },
  supported: commitment.hypotheses.H1_scene_before_texture.supported,
  peopleCount: { mean: commitment.hypotheses.H2_people_count.mean_crossing_U04, note: 'people-count rarely produces a clean fitted crossing, consistent with a generic counting-capability gap, not clean cultural commitment' },
  nLogistic: commitment.summary.n_attribute_curves_fitted_logistic,
  nFallback: commitment.summary.n_attribute_curves_interval_fallback,
}

/* F11: CFG sweep: distance from default per CFG value */
export const CFG_VALUES = cfgDist.cfg_values
export const CFG = cfgDist.results as unknown as Record<
  Sit,
  Record<Code, Record<string, { mean: number; ci_low: number; ci_high: number }>>
>
export const cfgImg = (sit: Sit, cfg: number) => `/images/cfg/${sit}_cfg${cfg}.webp`

/* F12: Mantel text-vs-image, per situation (SD 2.1's own CLIP encoder) */
export const MANTEL = Object.fromEntries(
  Object.entries(clipStats.results).map(([sit, v]) => [
    sit,
    {
      r: v.clip.mantel_test_text_vs_image.r,
      p: v.clip.mantel_test_text_vs_image.p_value,
      silhouette: v.clip.silhouette_score_image_space,
    },
  ])
) as Record<Sit, { r: number; p: number; silhouette: number }>
export const NATIVE_MANTEL = {
  significant: nativeMantel.n_situation_model_pairs_significant,
  total: nativeMantel.n_situation_model_pairs_total,
}
export interface Matrix9 { countries: string[]; txt_txt: number[][]; img_img_collapsed: number[][] }
export const MATRICES: Partial<Record<Sit, Matrix9>> = {
  wedding: matrixWedding.models.clip as unknown as Matrix9,
  funeral: matrixFuneral.models.clip as unknown as Matrix9,
}

/* F13: LAION inheritance null */
export const LAION = {
  rho: laion.intraset_correlation.rho,
  p: laion.intraset_correlation.p,
  n: laion.intraset_correlation.n,
  vendiRho: laion.vendi_correlation.rho,
  vendiP: laion.vendi_correlation.p,
  rows: laion.rows as { situation: string; country: string; retrieval_intraset_sim: number; output_intraset_sim: number }[],
  caveat:
    'Retrieval side is a proxy: a 503K-image CLIP index over LAION aesthetics-6.5+, not SD 2.1’s exact training slice. First-pass, pooled across all 54 cells.',
}
