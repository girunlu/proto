import { useState } from 'react'
import { SceneShell, Reveal, Panel } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { STATS } from '../data/research'
import { AUDITS } from '../data/part5'
import { qLabel } from '../data/part4'
import type { AuditAssumption } from '../data/part5'

const STAT_CELLS = [
  { v: STATS.images, label: 'generated images analyzed' },
  { v: STATS.prompts, label: 'frozen prompts · 6 situations × 9 variants' },
  { v: STATS.seeds, label: 'seeds per prompt, fixed across all variants' },
  { v: 7, label: 'models audited · 3 training lineages, 2 architectures' },
  { v: 36, label: 'of 36 model×situation cells replicate the Western default' },
  { v: 375, label: 'verified headline named assumptions (693 total)' },
]

/* F25: the auditor, on prompts it has never seen */
function AuditBrowser() {
  const [i, setI] = useState(0)
  const audit = AUDITS[i]
  const r = audit.report
  const headline = r.named_assumptions.filter((a) => a.tier === 'headline')
  const steerable = r.named_assumptions.filter((a) => a.steerability_detail?.steerable)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {AUDITS.map((a, ai) => (
          <button key={a.id} onClick={() => setI(ai)} className={`chip !px-2.5 !py-1 ${i === ai ? 'chip-active' : ''}`}>
            {a.id}
            {a.novel && <span className="ml-1.5 rounded border border-sky-300/40 bg-sky-300/10 px-1 text-[9px] text-sky-300">novel</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono2 text-[11px] text-foreground/50">
        <span>“{r.prompt}”</span>
        <span>model: {r.model}</span>
        <span>{r.n_seeds} seeds</span>
        <span>
          {headline.length} headline assumptions · {steerable.length} counter-steerable
        </span>
        {audit.novel && (
          <span className="rounded border border-sky-300/40 bg-sky-300/10 px-2 py-0.5 text-sky-300">
            out of the 54-prompt coverage · audited cold, no tuning
          </span>
        )}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {r.named_assumptions.slice(0, 6).map((a: AuditAssumption) => (
          <div key={a.question_id} className="rounded-lg border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono2 text-[10px] tracking-wider text-foreground/45 uppercase">{qLabel({ question_id: a.question_id, question: a.question } as never)}</span>
              {a.tier === 'headline' && (
                <span className="rounded border border-amber-300/40 bg-amber-300/10 px-1.5 py-0.5 font-mono2 text-[9px] text-amber-200">headline</span>
              )}
            </div>
            <div className="font-display mt-2 text-lg font-light">
              → <span className="text-amber-200">“{a.assumed_value}”</span>
              <span className="ml-2 font-mono2 text-[11px] text-foreground/50">{Math.round(a.consistency * 100)}%</span>
            </div>
            {a.steerability_detail && (
              <div className={`mt-3 rounded-md border px-2.5 py-1.5 font-mono2 text-[10px] leading-4 ${a.steerability_detail.steerable ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-red-400/25 bg-red-400/10 text-red-300'}`}>
                {a.steerability_detail.steerable
                  ? `counter-spec flips it → “${a.steerability_detail.majority_value_after}” (${Math.round(a.steerability_detail.consistency_after_counter_spec * 100)}%)`
                  : 'homogeneity trap: resists counter-specification'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Closing() {
  return (
    <>
      <SceneShell number="∴" kicker="Closing" title={<>Every image is a negotiation.</>}>
        <Reveal>
          <p className="prose-scene max-w-2xl">
            Between what was requested and what the model already believes. The prior cannot be disabled, guidance
            cannot tune it away, and additional words rarely purchase an exit. What is possible, right now, is{' '}
            <strong>knowing where to look</strong>: generate more than one seed, ask what never varies, and treat the
            first third of denoising as the moment at which the decision is actually made.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {STAT_CELLS.map((s) => (
              <div key={s.label} className="bg-card p-6">
                <div className="font-mono2 text-3xl text-amber-200">
                  <CountUp to={s.v} />
                </div>
                <div className="mt-2 font-mono2 text-[11px] leading-4 text-foreground/50">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </SceneShell>

      <SceneShell
        number="18"
        kicker="the instrument as a deliverable · finding 25"
        title={<>The Auditor works on prompts it has <em className="font-display italic text-amber-200">never seen.</em></>}
      >
        <Reveal>
          <p className="prose-scene max-w-2xl">
            The Assumption Auditor is not bound to the 54 prompts of this study. Below are six cached audit reports,
            including two deliberately novel prompts (<em>a birthday party</em>, <em>a graduation ceremony in
            Mexico</em>) outside the study's coverage. Where coverage ends, the instrument says so instead of guessing.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <Panel className="mt-10">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              cached audit reports · no live inference on this page
            </div>
            <div className="mt-5">
              <AuditBrowser />
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.15}>
          <Panel className="mt-6">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">what the auditor cannot see</div>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-foreground/70 md:grid-cols-2">
              <p>
                <strong className="text-foreground">The blind spot, restated.</strong> Prompts close to the default
                surface fewer named assumptions, because collapsed output clears the agreement bar more easily than a
                varied one. Fewer names never means fewer assumptions (Part IV).
              </p>
              <p>
                <strong className="text-foreground">The empty prompt's lean is not readable off the pixels.</strong>{' '}
                It exists in the measurement; an annotator looking at those 30 images cannot reliably name it (Part I).
                Both facts are stated wherever the instrument speaks.
              </p>
            </div>
          </Panel>
        </Reveal>
      </SceneShell>

      <SceneShell
        number="M"
        kicker="ending notes"
        title={<>How every number on this page <em className="font-display italic text-amber-200">was obtained.</em></>}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Panel className="h-full">
              <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">the measurements</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-foreground/70">
                <p>
                  <strong className="text-foreground">Nothing rests on one picture.</strong> Every claim is a
                  50-seed statistic with a bootstrap confidence interval. Where a single image appears, it is there to
                  show you what the statistic is about, never to carry it.
                </p>
                <p>
                  <strong className="text-foreground">Nothing rests on one measuring stick.</strong> Distances were
                  re-measured with CLIP as well as DINOv3, and you can switch between them on the charts themselves.
                  The reported gaps clear {STATS.permutation}: we shuffled the labels ten thousand times and no
                  shuffle reproduced them.
                </p>
                <p>
                  <strong className="text-foreground">Nothing rests on a single strong-looking gap.</strong>{' '}
                  {STATS.knn}, and {STATS.splitHalf}: the first 25 seeds and the last 25 give the same answer, so 50
                  is enough.
                </p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel className="h-full">
              <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">the reality anchor</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-foreground/70">
                <p>
                  Every comparison up to Part V is the model against itself. Part V is the model against photographs:
                  about <strong className="text-foreground">4,400 reference pictures</strong> from Wikimedia Commons,
                  put through the same metrics and the same blind questionnaire as the generated ones.
                </p>
                <p>
                  It places the plain prompt closest to real US weddings and farthest from real Indian ones, and it
                  finds the generated sets narrower than the real ones for <em>every</em> country. That second result
                  is the one that rules out the charitable reading, namely that the model is merely reflecting a world
                  which is itself repetitive.
                </p>
                <p className="text-foreground/55">
                  The known limit, stated where it applies: a few Commons categories are dominated by one prolific
                  photographer, which narrows those cells. It does not flip the direction of any comparison shown.
                </p>
              </div>
            </Panel>
          </Reveal>
        </div>
      </SceneShell>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="font-mono2 text-[11px] leading-5 text-foreground/40">
            <span className="text-foreground/70">promptswontsaveyou.dev</span> · interactive XAI explorable prototype.
            <br />
            Stable Diffusion 2.1 · DDIM 30 steps · 768² · DINOv3-7B embeddings · VQA annotators: gemma4 + qwen3_vl.
          </div>
          <div className="font-mono2 text-[11px] text-foreground/30">
            XAI × HCI · thesis explorable · cultural assumptions scope
          </div>
        </div>
      </footer>
    </>
  )
}
