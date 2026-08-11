// ─────────────────────────────────────────────────────────────────────────────
// REAL DATA: every number on this page traces to the project's analysis JSONs
// (distances.json, intraset_sim.json, vendi_score.json, lockin_logistic_fit.json,
//  cfg_distance.json, empty_prior_evidence.json, reality_anchor.json,
//  attribute_summary.json, escape_cost/{pair}.json, statistical_hardening.json)
// SD 2.1 · 6 situations × (default + 8 countries) × 50 seeds · DINOv3-7B · CFG 7
// ─────────────────────────────────────────────────────────────────────────────

export type Situation = 'wedding' | 'funeral' | 'breakfast' | 'family' | 'school' | 'celebration'
export type Country = 'US' | 'DE' | 'IN' | 'JP' | 'NG'

export const SITUATIONS: Situation[] = ['wedding', 'funeral', 'breakfast', 'family', 'school', 'celebration']

export const COUNTRIES: { id: Country; name: string; weird: 'near' | 'mid' | 'far'; cv: string }[] = [
  { id: 'US', name: 'United States', weird: 'near', cv: '--c-us' },
  { id: 'DE', name: 'Germany', weird: 'near', cv: '--c-de' },
  { id: 'JP', name: 'Japan', weird: 'mid', cv: '--c-jp' },
  { id: 'IN', name: 'India', weird: 'far', cv: '--c-in' },
  { id: 'NG', name: 'Nigeria', weird: 'far', cv: '--c-ng' },
]

export const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.id, c])) as Record<
  Country,
  (typeof COUNTRIES)[number]
>

// Finding 1: DINOv3 cosine distance from the default prompt's centroid (n=50, bootstrap CIs)
export const DISTANCES: Record<Situation, Record<Country, number>> = {
  wedding: { US: 0.061, DE: 0.138, IN: 0.484, JP: 0.346, NG: 0.532 },
  funeral: { US: 0.052, DE: 0.113, IN: 0.318, JP: 0.109, NG: 0.346 },
  breakfast: { US: 0.179, DE: 0.155, IN: 0.507, JP: 0.395, NG: 0.338 },
  family: { US: 0.204, DE: 0.301, IN: 0.499, JP: 0.482, NG: 0.534 },
  school: { US: 0.216, DE: 0.208, IN: 0.507, JP: 0.172, NG: 0.481 },
  celebration: { US: 0.48, DE: 0.249, IN: 0.489, JP: 0.389, NG: 0.572 },
}

// Finding 2: intraset similarity (higher = more homogeneous / collapsed)
export const INTRASET: Partial<Record<Situation, { default: number } & Partial<Record<Country, number>>>> = {
  celebration: { default: 0.444, NG: 0.726, JP: 0.634, IN: 0.679 },
  family: { default: 0.319, NG: 0.743, JP: 0.577, IN: 0.685 },
  wedding: { default: 0.502, NG: 0.73, JP: 0.596, IN: 0.634 },
  breakfast: { default: 0.437, NG: 0.567, JP: 0.577, IN: 0.579 },
}

// Vendi score: "effective number of distinct images" per variant
export const VENDI: { situation: Situation; default: number; ng: number }[] = [
  { situation: 'family', default: 18.84, ng: 4.16 },
  { situation: 'celebration', default: 13.28, ng: 4.43 },
  { situation: 'school', default: 12.39, ng: 3.68 },
  { situation: 'wedding', default: 11.56, ng: 4.4 },
]

// Specificity controls (Phase A2): matched neutral qualifiers vs the cultural qualifier
export const SPECIFICITY = {
  wedding: {
    controls: [
      { label: 'a large wedding', sim: 0.49 },
      { label: 'a wedding in the rain', sim: 0.54 },
      { label: 'a wedding in 1985', sim: 0.56 },
    ],
    default: 0.5,
    nigeriaBranch: [0.66, 0.75] as [number, number],
  },
  celebration: {
    controls: [
      { label: 'a large celebration', sim: 0.49 },
      { label: 'a celebration in the rain', sim: 0.56 },
      { label: 'a celebration in 1985', sim: 0.63 },
    ],
    default: 0.44,
    nigeriaBranch: [0.65, 0.74] as [number, number],
  },
}

// Finding 3: lock-in (logistic fit, 95% CI). 24 directions, 12 seeds/swap point.
export const LOCKIN = {
  hero: {
    label: 'wedding · Nigeria → USA',
    step: 9.6,
    ci: [8.4, 11.3] as [number, number],
    totalSteps: 30,
    // the fit's own parameters, not an eyeballed curve: lockin_logistic_fit.json
    // wedding_NG_to_US → crossing_step_mle 9.618, logistic_slope 0.6503,
    // crossing_step_ci [8.425, 11.293]. Was 1.05 here, which drew the curve
    // steeper than the fit the caption says it is.
    steepness: 0.6503,
  },
  breakfastRange: [9.2, 16.7] as [number, number],
  note: 'Commitment timing is early for all 24 directions, including visually close pairs (Japan↔Russia). What varies is the size of the visual gap, not when it closes.',
}

// Finding 4: CFG sweep, DINOv3 distance from default (wedding)
export const CFG_INDIA: { cfg: number; dist: number }[] = [
  { cfg: 1, dist: 0.052 },
  { cfg: 4, dist: 0.346 },
  { cfg: 7, dist: 0.484 },
  { cfg: 12, dist: 0.517 },
  { cfg: 15, dist: 0.528 },
]
export const CFG_NIGERIA_NOTE = 'wedding × Nigeria plateaus even harder: 0.491 at CFG 4 → 0.488 at CFG 15, flat after the initial jump.'

// Phase A3: empty-prompt prior (30 images, prompt = "", CFG 7.5)
export const EMPTY_PRIOR = {
  toDefault: 0.26,
  countries: [
    { id: 'DE', name: 'Germany', dist: 0.38, ratio: 0.96 },
    { id: 'US', name: 'United States', dist: 0.39, ratio: 1.0 },
    { id: 'IN', name: 'India', dist: 0.58, ratio: 1.48 },
    { id: 'NG', name: 'Nigeria', dist: 0.6, ratio: 1.53 },
  ],
}

// Reality anchor (Wikimedia Commons reference photos, 2,868 kept)
export const REALITY = {
  defaultVsRealUS: 0.512,
  defaultVsRealIN: 0.78,
  homogeneity: [
    { label: 'wedding × US', generated: 0.52, real: 0.19 },
    { label: 'wedding × Nigeria', generated: 0.73, real: 0.46 },
  ],
  failureCase: {
    assumption: 'outdoors',
    variant: 'a wedding in Nigeria',
    generated: 0.96,
    kappa: 0.78,
    realIndoors: 0.75,
  },
}

// Assumption Auditor (Phase A1): VQA-named assumptions, gemma4 alone (2026-07-31)
export const AUDITOR = {
  total: 708,
  headline: 448, // attribute_summary.json, gemma4-only table 2026-07-31 (was 693/375)
  imagesAudited: 2700,
  cards: [
    { prompt: 'a wedding', attribute: 'dress color', value: 'white', count: 46, n: 50, tier: 'headline' as const },
    { prompt: 'a wedding', attribute: 'venue', value: 'church or garden', count: 41, n: 50, tier: 'headline' as const },
    {
      prompt: 'a wedding in Nigeria',
      attribute: 'setting',
      value: 'outdoors',
      count: 48,
      n: 50,
      tier: 'headline' as const,
      kappa: 0.78,
      reality: 'real Nigerian wedding photos: 75% indoors',
    },
    {
      prompt: 'a wedding in Nigeria',
      attribute: 'people count',
      value: '6+ people',
      count: 47,
      n: 50,
      tier: 'headline' as const,
      note: 'resists counter-specification in 8/8 escape pairs',
    },
  ],
  blindSpot:
    'wedding × US and wedding × Germany surface zero headline named assumptions, not because they carry fewer, but because consistency thresholds are structurally easier to clear for a collapsed stereotype than for a diffuse baseline. The instrument inherits the bubble it measures.',
}

// Phase A2: escape cost (8 pairs: wedding/celebration × NG/IN/DE/EG)
export const ESCAPE = {
  weddingNG: {
    pair: 'a wedding in Nigeria',
    levels: [
      { id: 'default', prompt: 'a wedding', clause: null as string | null, load: 6, intraset: 0.5 },
      { id: 'L0', prompt: 'a wedding in Nigeria', clause: null, load: 10, intraset: 0.73 },
      { id: 'L1', prompt: 'a wedding in Nigeria, indoors', clause: 'indoors', load: 12, intraset: 0.71, flips: ['setting: outdoors 96% → indoors 100%'] },
      { id: 'L2', prompt: '…, modern attire', clause: 'modern attire', load: 10, intraset: 0.7, flips: ['attire: traditional → modern'] },
      { id: 'L3', prompt: '…, with a small group of people', clause: 'a small group of people', load: 10, intraset: 0.66, flips: [], resisted: ['people count: stays “6+” despite the clause'] },
    ],
    defaultIntraset: 0.5,
    escapeCost: null as null | number,
  },
  celebrationNG: { load: [5, 8, 11, 10, 7], escapeCost: null as null | number },
  celebrationEG: {
    pair: 'a celebration in Egypt',
    load: [8, 6, 4, 3],
    escapeCost: 1,
    clause: 'with confetti and fireworks',
    note: 'Egypt’s celebration default sits closer to the default prompt (≈0.32 vs 0.55–0.63 for NG/DE/IN), so one clause pulls the whole distribution back. Resistance tracks how deeply the rehearsed scene is dug in, not the country name.',
  },
  peopleCount: 'People count (“6+”) resisted counter-specification in all 8 of 8 pairs, even when the prompt explicitly asked for “a small group of people.”',
  generalization: '7 of 8 pairs never escape within 3 levels; assumption load rises or holds flat. Specification relocates assumptions; it does not remove them.',
}

// Paraphrase keying finding (§2e)
/* KEYING was deleted 2026-07-31 (review 05 · F-b). It carried the funeral-Egypt
   locative-vs-adjective numbers as hand-typed constants and no scene ever imported
   it. Scene 16·e now renders all three pairs and all four phrasings from
   `paraphrase_robustness.json` via remedy.json, with the bootstrap intervals — which
   is what makes the 2.4× a finding rather than a pair of numbers. */

// Statistical hardening
export const STATS = {
  permutation: 'p < 0.0001 for every headline gap (10k shuffles)',
  knn: 'k-NN separability AUC 0.96–0.99 even where centroid cosine looks weak (school, celebration)',
  splitHalf: 'split-half seed reliability holds (seeds 0–24 vs 25–49), so n=50 suffices',
  // every final_image.png under materials/generated:
  //   find materials/generated -name final_image.png | wc -l   ->  33936  (2026-07-31)
  // 13,530 SD 2.1 (the 54-prompt grid at five guidance values + 30 empty-prompt)
  // + 17,190 across the six other models + 1,850 escape-ladder + 750 paraphrase
  // + 400 second-degree + 156 auditor + 60 = 33,936. The escape-ladder line grew
  // 1,650 -> 1,850 on 2026-07-31: Job 1 added wedding_NG rungs L4-L7 (200 images),
  // taking that ladder from 4 clauses to 8. The trailing 60 is the SDXL and
  // Hunyuan-DiT empty-prompt runs (30 each), added 2026-07-30 after the 33,676
  // count. `audit_page.py` re-checks this against disk — do not hand-edit without
  // re-running it.
  // Job A completed 2026-08-02: 21,000 more images (7 models x 60 single-clause
  // conditions x 50 seeds, plus SD 2.1's 15 pilot-only conditions). Flux's 3,030
  // ran on a rented A40 and its files are on Hugging Face rather than this disk —
  // audit_page.py's REMOTE_IMAGES accounts for them, which is why the disk walk
  // reports 52,686 rather than this number.
  // Job 5 completed 2026-08-03: 600 more local (sdxl + hunyuandit own-clause
  // ladders, 2 pairs x 3 rungs x 50 seeds each), taking the own-clause table to
  // 6 of 7 models.
  images: 30000, /* rendered as a floor ("30,000+" / "more than 30,000"). The job ledger says
    59,016 (56,016 local incl. 30 pulled-back Flux empty-prior + 2,700 steer round 2 + 600
    Job 5, plus 3,000 Flux Job A still remote), but the last count verified on disk was
    33,936 (2026-07-31) and the later additions survive only in the ledger — with the
    generation repo gone, the page states the defensible floor, not the ledger. */
  seeds: 50,
  prompts: 54,
}

/* UNREFERENCED since 2026-08-11: the hero's pull-quote was removed along with the
   rest of the block between the author names and the introduction. Kept exported
   rather than deleted, in case a one-line statement of the finding is ever wanted
   again.

   "one rehearsed scene" until 2026-08-10, when the page settled on "scene" meaning
   the wedding/funeral/school axis. Reworded to "picture" so the sentence does not
   collide with the six scenes it sits above. */
export const THESIS = 'The default is Western; naming a country replaces it with one rehearsed picture; and that picture is settled in the first third of generation.'
