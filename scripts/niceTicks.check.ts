/* Lives outside src/ on purpose: tsc -b compiles src/ and has no node types.
   Runnable check for niceTicks (review 01 · R5.3). No test framework in this repo and
   one helper does not justify adding one:
     node --experimental-strip-types scripts/niceTicks.check.ts
   Wired into scripts/phase4_frontend_export/gate.sh. */
import assert from 'node:assert/strict'
import { niceTicks } from '../src/lib/utils.ts'

// the two real ranges from the scatters, plus the edges that broke the first version
const CASES: [number, number][] = [
  [0.198, 0.331], // EmptyScatter x — used to read 0.213 / 0.264 / 0.315
  [0.213, 0.315],
  [0.42, 0.78],
  [0, 1],
  [0.5, 0.52], // near-degenerate
  [3, 97], // wide: the first version drew a single tick here
]

for (const [lo, hi] of CASES) {
  const t = niceTicks(lo, hi)
  assert.ok(t.length >= 2 && t.length <= 8, `tick count ${t.length} for [${lo}, ${hi}]`)
  assert.ok(t.every((v) => v >= lo - 1e-9 && v <= hi + 1e-9), `out of range for [${lo}, ${hi}]`)
  assert.deepEqual([...t].sort((a, b) => a - b), t, `unsorted for [${lo}, ${hi}]`)
  // the whole point: labels must be round at the precision they are printed
  assert.ok(t.every((v) => Math.abs(v * 1e6 - Math.round(v * 1e6)) < 1e-6), `float drift for [${lo}, ${hi}]`)
}
assert.deepEqual(niceTicks(0.198, 0.331), [0.2, 0.25, 0.3])
assert.deepEqual(niceTicks(1, 1), [1]) // degenerate domain returns something drawable
console.log(`niceTicks OK — ${CASES.length} ranges`)
