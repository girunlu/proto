import Hero from '../sections/Hero'
import Overview from '../sections/Overview'
import Part1Default from '../sections/Part1Default'
import Part2Mechanism from '../sections/Part2Mechanism'
// Part III (the override) is DISMISSED, 2026-08-04 — unmounted, not deleted. The file
// and its data stay in the tree; nothing imports them. To bring it back: restore this
// import, the divider and <div id="p3"> below, and the NavRail entry.
// import Part3Override from '../sections/Part3Override'
import Part4Assumptions from '../sections/Part4Assumptions'
import Part5Reality from '../sections/Part5Reality'
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
import { REAL_PHOTOS_N } from '../data/part5'

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
      <PartDivider label="Part III · the escape attempts" sub="the fixes everyone reaches for first — more guidance, more words — measured" />
      <div id="p6">
        <CfgScene />
        <Part6Escape />
        <Part6Steer />
      </div>
      <PartDivider label="Part IV · the mechanism" sub="how deep does the assumption sit? committed early, and not copied from the training data" />
      <div id="p2">
        <Part2Mechanism />
      </div>
      <PartDivider label="Part V · an outside reference" sub={`${REAL_PHOTOS_N.toLocaleString()} real photographs of the same events, gathered as neutrally as we could · a comparison, not a ground truth`} />
      <div id="p5">
        <Part5Reality />
      </div>
      <PartDivider violet label="Part VI · is it just this model?" sub="the identical frozen instrument, run in full on six more models · all real data" />
      <div id="xa">
        <BranchAModels />
        <Part7Consensus />
      </div>
      <div id="closing">
        <Closing />
      </div>
    </main>
    </ModelProvider>
  )
}
