// ─────────────────────────────────────────────────────────────────────────────
// PART III: THE OVERRIDE · findings F6–F7
// The F8 sub-cluster scene was cut in the 2026-07-29 design pass (the
// clusters were not legible in the images they group), so that source file
// is no longer read. What survives here is the scene-level question vocabulary,
// which part4 still builds on.
// ─────────────────────────────────────────────────────────────────────────────

// scene-level question labels ONLY (handbook rule: scene-level names, never
// ethnicity/geography labels: U12 continent and C-codes are deliberately excluded)
export const Q_LABELS: Record<string, string> = {
  U01: 'setting',
  U02: 'locale',
  U03: 'people present',
  U04: 'people count',
  U05b: 'attire',
  U06: 'headwear',
  U07: 'structure',
  U08: 'era',
  U09: 'time of day',
  U10: 'weather',
  U11: 'wealth cues',
}
