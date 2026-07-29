import Hero from '../sections/Hero'
import Part1Default from '../sections/Part1Default'
import Part2Mechanism from '../sections/Part2Mechanism'
import Part3Override from '../sections/Part3Override'
import Part4Assumptions from '../sections/Part4Assumptions'
import Part5Reality from '../sections/Part5Reality'
import Part6Escape from '../sections/Part6Escape'
import BranchAModels from '../sections/BranchAModels'
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
  return (
    <ModelProvider>
    <main className="relative">
      <ModelBar />
      <NavRail />
      <Hero />
      <PartDivider label="Part I · the default" sub="the unqualified prompt already has a nationality · real seeds, real geometry" />
      <div id="p1">
        <Part1Default />
      </div>
      <PartDivider label="Part II · the mechanism" sub="how deep does the assumption sit? committed early, coarse to fine, unreachable by guidance" />
      <div id="p2">
        <Part2Mechanism />
      </div>
      <PartDivider label="Part III · the override" sub="naming a country doesn't enrich the output, it collapses it · only cultural qualifiers do this" />
      <div id="p3">
        <Part3Override />
      </div>
      <PartDivider label="Part IV · the assumptions, named" sub="375 verified cards, each paired with the real 50-seed distribution it summarizes" />
      <div id="p4">
        <Part4Assumptions />
      </div>
      <PartDivider label="Part V · reality" sub="the same blind questionnaire on ~4,400 real photographs of the same events" />
      <div id="p5">
        <Part5Reality />
      </div>
      <PartDivider label="Part VI · the escape and its price" sub="counter-specification flips attributes but never buys the distribution back" />
      <div id="p6">
        <Part6Escape />
      </div>
      <PartDivider violet label="Branch A · is it just this model?" sub="the identical frozen instrument, run in full on six more models · all real data" />
      <div id="xa">
        <BranchAModels />
      </div>
      <div id="closing">
        <Closing />
      </div>
    </main>
    </ModelProvider>
  )
}
