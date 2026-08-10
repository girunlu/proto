import { useState } from 'react'
import Hero from '../sections/Hero'
import Introduction from '../sections/Introduction'
import Part1Default from '../sections/Part1Default'
import { CommitEarlyScene, TextEncoderScene } from '../sections/Part2Mechanism'
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
import { CfgScene } from '../sections/Part6Escape'
// import Part6Steer from '../sections/Part6Steer'  // dismissed 2026-08-10
import BranchAModels from '../sections/BranchAModels'
// import Part7Consensus from '../sections/Part7Consensus'  // dismissed 2026-08-10
import Conclusion from '../sections/Conclusion'
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

function AlignmentSourceLead() {
  return (
    <div className="mx-auto mt-20 w-full max-w-6xl px-6">
      <h2 className="font-display max-w-4xl text-4xl leading-tight font-light md:text-5xl">
        The Source of the Geographic Alignment
      </h2>
    </div>
  )
}

function StabilizationLead() {
  return (
    <div className="mx-auto mt-20 w-full max-w-6xl px-6">
      <h2 className="font-display max-w-4xl text-4xl leading-tight font-light md:text-5xl">
        When Country-Specific Assumptions Stabilize
      </h2>
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
      <div id="intro">
        <Introduction />
      </div>
      {/* ── the new section structure, 2026-08-10 (Giray) ────────────────────
          introduction · underspecified alignment · alignment source · semantic
          assumptions · assumption stabilization · conclusion · references ·
          acknowledgements, with the extras kept.

          Anchors keep their historical ids so nothing that links here breaks.

          Scene numbers were resequenced 01–08 in page order on 2026-08-10: they had
          drifted out of order and 03 was used twice. The "finding N" kickers went at
          the same time — they referenced an internal ledger the reader has no access
          to, and after the restructure they ran 12, 11, 14–15, 16, 9 down the page.
          If a scene is ever moved again, renumber the whole run rather than patching
          one. */}
      <PartDivider label="underspecified alignment" sub="what the model supplies when the country is left unsaid, and how far that sits from naming one" />
      <div id="p1">
        <Part1Default />
      </div>
      <PartDivider label="alignment source" sub="do the assumptions arrive with the sentence, or get added on the way to the image?" />
      <div id="p2">
        <AlignmentSourceLead />
        <TextEncoderScene />
        {/* the guidance sweep belongs to this section, not to stabilization: it tests
            a second explanation for where the alignment comes from (2026-08-10). */}
        <CfgScene />
      </div>
      <PartDivider label="semantic assumptions" sub="the concepts the model fills in, named one question at a time" />
      <div id="p4">
        <Part4Assumptions />
      </div>
      <PartDivider label="assumption stabilization" sub="switching the country partway through denoising, to find when the choice is already fixed" />
      <div id="p3">
        <StabilizationLead />
        <CommitEarlyScene />
      </div>
      <div id="conc">
        <Conclusion />
      </div>
      <PartDivider label="extras · across models" sub="the identical frozen instrument, re-run in full on six more models" />
      <div id="p6">

        {showExtras ? (
          <>
            <div id="xa">
              <BranchAModels />
              {/* X3, the shared prior, is DISMISSED 2026-08-10 (Giray).
                  Unmounted, not deleted: Part7Consensus.tsx is intact. */}
              {/* <Part7Consensus /> */}
            </div>
            {/* X3, "what a clause can move", is DISMISSED 2026-08-10 (Giray).
                Unmounted, not deleted: Part6Steer.tsx is intact. */}
            {/* <Part6Steer /> */}
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
              is the Western default a property of this one model?
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
