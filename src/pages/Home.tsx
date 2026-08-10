import { useState } from 'react'
import Hero from '../sections/Hero'
import Overview from '../sections/Overview'
import Part1Default from '../sections/Part1Default'
import Part2Mechanism from '../sections/Part2Mechanism'
// The override (old Part III) is DISMISSED, 2026-08-06 — it spent a day mounted in the
// extras section for review and came back out: the stereotyping-inversion scene and the
// specifically-cultural control are out of the flow. Unmounted, not deleted.
// import Part3Override from '../sections/Part3Override'
import Part4Assumptions from '../sections/Part4Assumptions'
// Part V (the outside reference, scene 12) is DISMISSED, 2026-08-06 — the collected
// reference-photograph set is not reliable enough to anchor a comparison. Unmounted,
// not deleted: the file and part5.ts's data stay in the tree. To bring it back:
// restore this import, the divider and <div id="p5"> below, and the NavRail/Overview
// entries.
// import Part5Reality from '../sections/Part5Reality'
// Scene 16·d, the prompt clinic ("try it yourself"), is DISMISSED 2026-08-06 —
// unmounted, not deleted, same treatment as Part III. The file and remedy.json's
// `clinic` block stay in the tree; nothing imports them. To bring it back: restore
// this import and the <Part6Clinic /> below.
// import Part6Clinic from '../sections/Part6Clinic'
// Scene 16·a, the size of the bill, is DISMISSED 2026-08-06 — unmounted, not deleted.
// Part VI now opens on scene 16. The file is intact (chart card, threshold slider,
// predict-before-reveal) and remedy.json's `debt` block is untouched; restore this
// import and the <Part6Debt /> below to bring the whole scene back.
// import Part6Debt from '../sections/Part6Debt'
import Part6Escape, { CfgScene } from '../sections/Part6Escape'
import Part6Steer from '../sections/Part6Steer'
import BranchAModels from '../sections/BranchAModels'
import Part7Consensus from '../sections/Part7Consensus'
import Closing from '../sections/Closing'
import { NavRail } from '../components/NavRail'
import { ModelBar } from '../components/ModelBar'
import { ModelProvider } from '../data/modelData'

function PartDivider({ label, sub, violet }: { label: string; sub: string; violet?: boolean }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-24">
      <div className={`flex items-center gap-4 font-mono2 text-[11px] tracking-[0.35em] uppercase ${violet ? 'text-violet-300/70' : 'text-amber-200/60'}`}>
        <span className={`h-px flex-1 ${violet ? 'bg-violet-400/30' : 'bg-amber-300/25'}`} />
        {label}
        <span className={`h-px flex-1 ${violet ? 'bg-violet-400/30' : 'bg-amber-300/25'}`} />
      </div>
      <p className="mt-3 text-center font-mono2 text-[11px] tracking-wider text-foreground/35">{sub}</p>
    </div>
  )
}

export default function Home() {
  /* the technique scenes (override + escape attempts) stay out of the main flow and
     out of the initial page weight — mounted only on request */
  const [showExtras, setShowExtras] = useState(false)
  return (
    <ModelProvider>
    <main className="relative">
      <ModelBar />
      <NavRail />
      <Hero />
      <div id="start">
        <Overview />
      </div>
      <PartDivider label="Part I · the default" sub="the default prompt already has a nationality · real seeds, real geometry" />
      <div id="p1">
        <Part1Default />
      </div>
      <PartDivider label="Part II · the assumptions, named" sub="every named assumption paired with the real 50-seed distribution it summarizes" />
      <div id="p4">
        <Part4Assumptions />
      </div>
      <PartDivider label="Part III · the mechanism" sub="how deep does the assumption sit? settled in the first third of denoising" />
      <div id="p2">
        <Part2Mechanism />
      </div>
      {/* Reordered 2026-08-10 (Giray): the mechanism now precedes the escape — you
          need to know when the choice is made before it means anything that a clause
          cannot undo it. The guidance knob came out of the extras and opens the part:
          it is the cheapest thing a user would reach for, so it gets refused first,
          and the prompting follows. Anchors keep their old ids (#p2/#p3) so existing
          links and the Overview jump list do not break. */}
      <PartDivider label="Part IV · the escape" sub="turning the dial, then counter-specifying the named assumptions one clause at a time · measured" />
      <div id="p3">
        <CfgScene />
        <Part6Escape />
      </div>
      {/* Part V · an outside reference — DISMISSED 2026-08-06 (unreliable reference set).
          Restore the import above and this block to bring it back:
      <PartDivider label="Part V · an outside reference" sub="real photographs of the same events, gathered as neutrally as we could · a comparison, not a ground truth" />
      <div id="p5">
        <Part5Reality />
      </div>
      */}
      {/* The cross-model part (was Part V) moved into the extras wholesale on
          2026-08-10 (Giray), ahead of what was already there — so the steering
          scene is now the last thing on the page before the closing. It keeps its
          #xa anchor, which resolves once the extras are open. */}
      <PartDivider label="extras · across models" sub="how far the cultural assumptions agree from one model to the next, and what the attempts to undo them actually report" />
      <div id="p6">
        {showExtras ? (
          <>
            <div id="xa">
              <BranchAModels />
              <Part7Consensus />
            </div>
            <Part6Steer />
            <div className="mx-auto max-w-6xl px-6 pt-12 text-center">
              <button
                onClick={() => {
                  setShowExtras(false)
                  document.getElementById('p6')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="rounded-md border border-border px-4 py-2 font-mono2 text-xs text-foreground/60 transition hover:border-amber-300/50 hover:text-amber-200"
              >
                hide the extras
              </button>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-6xl px-6 pt-10 text-center">
            <button
              onClick={() => setShowExtras(true)}
              className="rounded-md border border-border px-4 py-2 font-mono2 text-xs text-foreground/60 transition hover:border-amber-300/50 hover:text-amber-200"
            >
              show the extras
            </button>
            <p className="mt-3 font-mono2 text-[10px] tracking-wider text-foreground/35">
              cross-model agreement on the named assumptions, and the reverting attempts, reported
            </p>
          </div>
        )}
      </div>
      <div id="closing">
        <Closing />
      </div>
    </main>
    </ModelProvider>
  )
}
