/* Lives outside src/ on purpose: tsc -b compiles src/ and has no node types.
   Runnable check for pickActive, the NavRail's active-stop rule:
     node --experimental-strip-types scripts/navRail.check.ts
   Companion to scripts/niceTicks.check.ts. */
import assert from 'node:assert/strict'
import { pickActive } from '../src/lib/utils.ts'

const MARK = 400 // 45% of a 900px viewport

/* The rule the old loop got wrong. It kept the last *listed* match, so a stop
   listed early but sitting low on the page was overwritten by every later entry
   above it — and could never hold the highlight. Here the reader is inside `p3`
   (top just above the fold) while `p2` sits far above; listing p3 first is what
   a part reorder produces if the list is not also rewritten.
   Old loop: p3 matches → current=p3, then p2 matches → current=p2. Wrong. */
assert.equal(
  pickActive(
    [
      { id: 'p4', top: -6000 },
      { id: 'p3', top: -20 },
      { id: 'p2', top: -3000 },
      { id: 'xa', top: 1500 },
    ],
    MARK
  ),
  'p3',
  'a list out of DOM order must not cost a stop its highlight'
)

/* Same shape, the other direction: reader is in p2, list still stale. The old
   loop returns p2 here by luck — it is the last listed — which is why the bug
   only showed on one of the two swapped stops. */
assert.equal(
  pickActive(
    [
      { id: 'p4', top: -6000 },
      { id: 'p3', top: 1200 },
      { id: 'p2', top: -20 },
      { id: 'xa', top: 4000 },
    ],
    MARK
  ),
  'p2'
)

// the ordinary case: last stop whose top has passed the mark
assert.equal(
  pickActive([{ id: 'a', top: -800 }, { id: 'b', top: -100 }, { id: 'c', top: 900 }], MARK),
  'b'
)

// exactly on the line counts as passed
assert.equal(pickActive([{ id: 'a', top: -10 }, { id: 'b', top: MARK }], MARK), 'b')

// nothing has reached the mark yet — the first stop holds, never an empty string
assert.equal(pickActive([{ id: 'a', top: 700 }, { id: 'b', top: 1500 }], MARK), 'a')

/* A dismissed part (Part V, #p5) leaves no element. It must be skipped, not read
   as top 0 — otherwise it would outrank every section above the fold. */
assert.equal(
  pickActive([{ id: 'a', top: -100 }, { id: 'p5', top: null }, { id: 'b', top: 900 }], MARK),
  'a'
)

// scrolled past everything: the last stop wins
assert.equal(
  pickActive([{ id: 'a', top: -3000 }, { id: 'b', top: -2000 }, { id: 'c', top: -50 }], MARK),
  'c'
)

console.log('pickActive OK — 7 cases')
