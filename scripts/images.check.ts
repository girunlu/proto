/* Lives outside src/ on purpose (same reason as niceTicks.check.ts): tsc -b compiles
   src/ and has no node types. Bundles with esbuild — already a vite dependency — because
   the data modules import JSON without an import attribute, which bare node rejects:

     node_modules/.bin/esbuild scripts/images.check.ts --bundle --platform=node \
       --format=esm --loader:.json=json --outfile=/tmp/imgcheck.mjs && node /tmp/imgcheck.mjs

   Calls the app's OWN url builders over the complete argument space its call sites can
   reach — taken from the same manifests the components read — then stats each path.
   No browser, no crawl, no sampling: a hover-only or click-only image is checked exactly
   like one that renders on load.

   Three classes, because "file on disk that nobody requests" is usually correct and
   only the other two are bugs:
     BROKEN   the UI asks for a path that is not there            → always a bug
     UNBACKED the UI plots a rung whose upstream artifacts do not
              exist (no images AND no embeddings)                 → worse than broken
     ORPHAN   on disk, never requested — classified against RULES
              below, so a by-design surplus never reads as a bug */
import fs from 'node:fs'
import path from 'node:path'

import { SITS, C8, cell, seedImg, type Sit, type Code } from '../src/data/part1'
import { modelImg, modelSeeds, seedCount, isSd21 } from '../src/data/modelData'
import { MODELS as MODEL_DEFS } from '../src/data/modelContext'
import {
  publishedSeeds, dissimilarSeeds, xmEscapeImg, LADDER_MODELS, escapePairsFor, f3For,
} from '../src/data/crossmodel'
import {
  XM, DAAM_INDEX, daamImg, REAL_CREDITS, controlImg, cfgImgCell, xmImgPath, swapImgSeed, ESCAPE_PAIRS,
} from '../src/data/uiv2'
import { DIRECTIONS, LOCKUP_STEPS } from '../src/data/part2'
import X from '../src/data/crossmodel.json'

/* run from the repo root — the bundle lands in /tmp, so import.meta.dirname is not it */
const PUB = path.join(process.cwd(), 'public')
const RAW = '/home/giray/Desktop/code_giray/materials/generated/cultural_escape'
const MODELS = MODEL_DEFS.map((m) => m.id)
const CODES = Object.keys(C8) as Code[]
const CELLS: [Sit, Code | 'default'][] = SITS.flatMap((s) =>
  (['default', ...CODES] as (Code | 'default')[]).map((c) => [s, c] as [Sit, Code | 'default'])
)

/* Orphans that are correct by construction. Anything not matched here is surfaced,
   so a new stale set cannot hide inside a big expected number. */
const RULES: { test: (f: string) => boolean; why: string }[] = [
  { test: (f) => /^images\/xm\/sd21_/.test(f),
    why: 'unreachable by design — xmImgPath routes sd21 to /images/seeds/, so these duplicate seeds/' },
  { test: (f) => /^images\/xm\//.test(f),
    why: 'exported surplus — published[] ships 24 of the ~29 per cell (UI_MAP §3 rule 1)' },
  { test: (f) => /^images\/escape\/.*_s0[3-5]\.webp$/.test(f),
    why: 'exported surplus — 6 seeds per rung on disk, the scene shows 3' },
  { test: (f) => /^images\/controls\/.*_s03\.webp$/.test(f),
    why: 'exported surplus — 4 seeds per control on disk, the scene shows 3' },
  { test: (f) => /^images\/cfg\/.*_cfg7\.webp$/.test(f),
    why: 'decided cut — the guidance grid shows [1, 4, 12, 15]' },
  { test: (f) => /^images\/zero\//.test(f),
    why: 'decided cut — the empty-prompt scene was dismissed; scene 03 is now MapScene' },
]

const seen = new Set<string>()
const broken = new Map<string, string[]>()
const used = new Set<string>()

function want(scene: string, url: string) {
  const k = scene + '|' + url
  if (seen.has(k)) return
  seen.add(k)
  const rel = url.replace(/^\//, '')
  used.add(rel)
  if (!fs.existsSync(path.join(PUB, rel))) {
    if (!broken.has(scene)) broken.set(scene, [])
    broken.get(scene)!.push(url)
  }
}

// ── every seed a cell offers, through both builders that can render it
for (const m of MODELS) {
  for (const [sit, code] of CELLS) {
    const order = isSd21(m) ? cell(sit, code).typical_order : (publishedSeeds(m, sit, code) ?? [])
    if (!isSd21(m) && publishedSeeds(m, sit, code) == null)
      want(`published[] manifest ${m}`, `[no entry for ${sit}_${code}]`)
    for (const s of order) {
      want(`modelImg ${m}`, modelImg(m, sit, code, s))
      want(`xmImgPath ${m}`, xmImgPath(m, sit, code, s))
    }
    for (const s of dissimilarSeeds(m, sit, code, 12) ?? []) want(`mosaic ${m}`, modelImg(m, sit, code, s))
    for (const s of modelSeeds(m, sit, code, seedCount(m, sit, code))) want(`modelSeeds ${m}`, modelImg(m, sit, code, s))
  }
  // scene 04's strip indexes 0..n-1 for SD 2.1 and the published list otherwise
  for (const sit of SITS) {
    const labels = isSd21(m) ? null : f3For(m, sit)
    const have = isSd21(m)
      ? cell(sit, 'default').typical_order.map((_, i) => i)
      : (publishedSeeds(m, sit, 'default') ?? [])
    for (const s of have) want(`scene04 strip ${m}`, modelImg(m, sit, 'default', s))
    if (labels?.length && have.some((s) => s >= labels.length))
      want(`scene04 f3 out of range ${m}`, `[${sit}: f3 len ${labels.length}, published max ${Math.max(...have)}]`)
  }
}

// least-typical pick per model — drawn from XM, not from published[]
for (const [ck, x] of Object.entries(XM)) {
  const [sit, code] = ck.split('_') as [Sit, Code | 'default']
  for (const p of x.picks) want('XM.picks', xmImgPath(p.model, sit, code, p.seed))
}

for (const [ck, idx] of Object.entries(DAAM_INDEX)) {
  const [sit, code] = ck.split('_') as [Sit, Code | 'default']
  for (let s = 0; s < (idx.n_seeds ?? 8); s++) {
    want('DAAM base', seedImg(sit, code, s))
    for (const tok of idx.tokens) want('DAAM map', daamImg(sit, code, s, tok))
  }
}

for (const d of DIRECTIONS) for (const st of LOCKUP_STEPS) for (let s = 0; s < 12; s++) want('swaps', swapImgSeed(d, st, s))
for (const sit of SITS) for (const c of CODES) for (let s = 0; s < 12; s++) want('swap endpoints', seedImg(sit, c, s))
for (const w of ['wedding', 'celebration'])
  for (const c of ['ctrl_large', 'ctrl_rain', 'ctrl_1985'])
    for (let s = 0; s < 3; s++) want('controls', controlImg(`${w}_NG`, c, s))
for (const [sit, code] of CELLS) for (const v of [1, 4, 12, 15]) want('cfg', cfgImgCell(sit, code, v))
for (const [ck, list] of Object.entries(REAL_CREDITS))
  for (const p of list as { file: string }[]) want(`reality ${ck}`, `/images/reality/${p.file}`)

for (const m of LADDER_MODELS) {
  const pairs = (isSd21(m) ? ESCAPE_PAIRS : escapePairsFor(m) ?? {}) as Record<string, any>
  for (const [pk, p] of Object.entries(pairs)) {
    /* same rule the scene applies: a rung absent from escape_umap was never generated,
       so it renders the "never run" note instead of asking for thumbnails */
    const backed: string[] = (X as any).escape_umap?.[m]?.[pk]?.levels ?? []
    for (const l of p.levels as { id: string; control?: boolean }[]) {
      if (l.id === 'default' || l.id === 'L0' || l.control || !backed.includes(l.id)) continue
      for (let s = 0; s < 3; s++) want(`escape ladder ${m}`, xmEscapeImg(m, pk, l.id, s))
    }
  }
}

// ── UNBACKED: a rung the scene plots that nothing upstream produced
const unbacked: string[] = []
for (const [pk, p] of Object.entries(ESCAPE_PAIRS as Record<string, any>)) {
  const rawLevels = fs.existsSync(`${RAW}/${pk}`) ? fs.readdirSync(`${RAW}/${pk}`) : []
  const umapLevels: string[] = (X as any).escape_umap?.sd21?.[pk]?.levels ?? []
  for (const l of p.levels as { id: string; control?: boolean }[]) {
    if (l.id === 'default' || l.control) continue
    const missing = [
      rawLevels.includes(l.id) ? null : 'no raw generation',
      umapLevels.includes(l.id) ? null : 'no DINOv3 embedding',
    ].filter(Boolean)
    if (missing.length === 2) unbacked.push(`sd21 ${pk} ${l.id} — ${missing.join(', ')}`)
  }
}

// ── report
const nBroken = [...broken.values()].reduce((a, b) => a + b.length, 0)
console.log(`checked ${used.size} distinct urls\n`)
console.log(`BROKEN: ${nBroken}`)
for (const [scene, list] of [...broken].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${scene} — ${list.length}`)
  for (const u of list.slice(0, 6)) console.log(`     ${u}`)
  if (list.length > 6) console.log(`     ... +${list.length - 6} more`)
}
console.log(`\nUNBACKED: ${unbacked.length}`)
for (const u of unbacked) console.log(`  ${u}`)

const onDisk: string[] = []
;(function walk(d: string) {
  for (const e of fs.readdirSync(d, { withFileTypes: true }))
    e.isDirectory() ? walk(path.join(d, e.name)) : onDisk.push(path.relative(PUB, path.join(d, e.name)))
})(path.join(PUB, 'images'))

const explained = new Map<string, number>()
const unexplained: string[] = []
for (const f of onDisk.filter((f) => !used.has(f))) {
  const r = RULES.find((r) => r.test(f))
  if (r) explained.set(r.why, (explained.get(r.why) ?? 0) + 1)
  else unexplained.push(f)
}
console.log(`\nORPHANS accounted for:`)
for (const [why, n] of [...explained].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${why}`)
console.log(`\nORPHANS UNACCOUNTED FOR: ${unexplained.length}`)
for (const f of unexplained) console.log(`  ${f}`)

process.exit(nBroken || unbacked.length || unexplained.length ? 1 : 0)
