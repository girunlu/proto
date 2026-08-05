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
import Part6Clinic from '../sections/Part6Clinic'
import Part6Debt from '../sections/Part6Debt'
import Part6Escape from '../sections/Part6Escape'
import Part6Steer from '../sections/Part6Steer'
import BranchAModels from '../sections/BranchAModels'
import Part7Consensus from '../sections/Part7Consensus'
import Closing from '../sections/Closing'
import { NavRail } from '../components/NavRail'
import { ModelBar } from '../components/ModelBar'
import { ModelProvider } from '../data/modelData'
import { REAL_PHOTOS_N, REAL_QUESTIONNAIRE_N } from '../data/part5'

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
      <PartDivider label="Part I · the default" sub="the unqualified prompt already has a nationality · real seeds, real geometry" />
      <div id="p1">
        <Part1Default />
      </div>
      <PartDivider label="Part II · the mechanism" sub="how deep does the assumption sit? committed early, coarse to fine, unreachable by guidance" />
      <div id="p2">
        <Part2Mechanism />
      </div>
      <PartDivider label="Part IV · the assumptions, named" sub="every named assumption paired with the real 50-seed distribution it summarizes" />
      <div id="p4">
        <Part4Assumptions />
      </div>
      <PartDivider label="Part V · reality" sub={`${REAL_PHOTOS_N.toLocaleString()} real photographs of the same events · the blind questionnaire on ${REAL_QUESTIONNAIRE_N.toLocaleString()} of them`} />
      <div id="p5">
        <Part5Reality />
      </div>
      <PartDivider label="Part VI · the escape and its price" sub="you can change what is in the picture; you cannot change how few pictures there are" />
      <div id="p6">
        <Part6Debt />
        <Part6Escape />
        <Part6Steer />
        <Part6Clinic />
      </div>
      <PartDivider violet label="Part VII · is it just this model?" sub="the identical frozen instrument, run in full on six more models · all real data" />
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
