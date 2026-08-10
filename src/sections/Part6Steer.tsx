import { motion } from 'framer-motion'
import { Setup } from '../components/Viz'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { rgb } from '../lib/colors'
import { Q_TEXT, Q_FAMILY } from '../data/uiv2'
import { MODEL_NAME, type ModelId } from '../data/modelContext'
import { STEER_ROWS, STEER_PER_MODEL, STEER_N_CELLS, LADDER_CELLS, steerTotal, type Bucket } from '../data/remedy'

/* derived, not typed in: Job 5 added sdxl + hunyuandit on 2026-08-03 and the two
   counts below moved with it. */
const N_STEER_MODELS = Object.keys(STEER_PER_MODEL).length
const N_LADDERS = Object.values(LADDER_CELLS).flat().length

/* Q_FAMILY has existed in uiv2.ts since the Tier-B pass and nothing rendered it.
   The families are exactly the grouping this scene's finding is about — place and
   venue yield, era and presence do not — so it finally has a job. */
const FAMILY_CV: Record<string, string> = {
  'where it happens': '--c-em',
  'what people wear': '--c-amber',
  'who is there': '--c-sky',
  'when it looks like': '--c-red',
  'what objects appear': '--c-gray',
  'how well-off it looks': '--c-sky',
  'where in the world it looks like': '--c-red',
  'what kind of event': '--c-gray',
  'the scene overall': '--c-gray',
}

export default function Part6Steer() {
  /* The two-view toggle was removed 2026-08-03: 12 of the 19 rows were byte-identical
     between them and only 3 differed by more than 2 points, so it cost the reader a
     decision and a paragraph to change almost nothing. What survives is the side-effect
     view — the scene's actual claim. That clauses DO move their own target is stated in
     prose below rather than given its own control. */
  const bucket: Bucket = 'untargeted'
  /* Sorted by flip rate, biggest first. This was briefly a fixed canonical order, back
     when two buttons swapped the underlying number and the rows visibly reshuffled under
     the reader. With a single view there is nothing to jump against, and ranking is the
     more useful axis: the chart's whole point is which things yield and which never do. */
  const rows = [...STEER_ROWS]
    .filter((r) => r[bucket].n > 0)
    .sort((a, b) => b[bucket].k / b[bucket].n - a[bucket].k / a[bucket].n)
  const total = steerTotal(bucket)
  const u12 = STEER_ROWS.find((r) => r.q === 'U12')?.[bucket]
  const oneIn = Math.round(total.n / Math.max(1, total.k))

  return (
    <SceneShell
      number="X3"
      kicker="extras · what a clause can move"
      title={<>Some things yield to a clause. <em className="font-display italic text-amber-200">Some things never move at all.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The ladder walks one prompt at a time. Pool every counter-specified rung instead,{' '}
          {total.n} side-effect observations across {N_STEER_MODELS} models, and ask, per attribute: when a clause
          was added, how often did the answer actually change?
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 max-w-3xl">
          <Setup
            rows={[
              { k: 'what we ran', v: 'One clause, one attribute, depth exactly one, 60 prompts × 7 models × 50 seeds. Every rung of every ladder pooled, rather than one prompt walked at a time.' },
              { k: 'which attributes', v: 'Drawn from the ground set: the values all seven models independently name. The gate picks them balanced by assumed value, so the run deliberately carries clauses that fail as well as clauses that work.' },
              { k: 'who answered', v: 'gemma4, blind to the prompt, on seeds 0–19 of each condition.' },
              { k: 'how we know', v: 'Per-attribute flip verdicts with 95% Wilson intervals, then grouped by attribute, by model and by cell to ask which of the three the answer actually belongs to.' },
            ]}
          detail={<>
              <p>
                <strong>Why depth exactly one.</strong> Pooled ladder data could not answer this, no attribute
                appeared in three or more cells, so attribute, prompt and model were hopelessly confounded. A
                single-clause factorial breaks that: one clause, one attribute, everything else fixed.
              </p>
              <p>
                <strong>The ground set.</strong> Attributes are drawn only from values all seven models independently
                name, and the selection gate balances them by assumed value, so the run deliberately contains clauses
                that fail as well as clauses that work. A set chosen for success would have measured nothing.
              </p>
              <p>
                <strong>The statistic.</strong> Per-attribute flip rates with 95% Wilson intervals (which behave at the
                extremes, where normal-approximation intervals run outside [0,1]), then the verdicts grouped by
                attribute, by model and by cell to ask which factor the answer actually belongs to.
              </p>
          </>}
        />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            flip rate per attribute · 95% Wilson intervals
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/65">
            Every clause was written to change one specific thing, and that target is{' '}
            <strong className="text-amber-200">left out of these bars</strong>: what you see is the side effects, the
            decisions nobody asked about. Clauses usually do move their own target; that is them working.
          </p>

          <div className="mt-6 space-y-1">
            {rows.map((r, idx) => {
              const b = r[bucket]
              const p = b.k / b.n
              const fam = Q_FAMILY[r.q] ?? 'the scene overall'
              /* the finding as a shape: everything below this line is a hard zero, and
                 ranking is what makes the break visible without reading a number */
              const firstZero = p === 0 && idx > 0 && rows[idx - 1][bucket].k > 0
              return (
                <div key={r.q}>
                {firstZero && (
                  <div className="flex items-center gap-3 pt-3 pb-1.5">
                    <span className="w-40 shrink-0" />
                    <span className="min-w-0 flex-1 border-t border-red-300/25" />
                    <span className="shrink-0 font-mono2 text-[9px] tracking-wider text-red-300/80 uppercase">
                      below here, no clause ever moved it
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/55" title={`${Q_TEXT[r.q] ?? r.q} · ${fam}`}>
                    {Q_TEXT[r.q] ?? r.q}
                  </span>
                  <div className="relative h-4 min-w-0 flex-1 rounded-sm bg-foreground/5">
                    {/* the Wilson interval, drawn behind the point estimate — with n
                        this small the interval is the honest object, not the bar */}
                    <div
                      className="absolute inset-y-1 rounded-sm bg-foreground/10"
                      style={{ left: `${b.lo * 100}%`, width: `${Math.max(0.5, (b.hi - b.lo) * 100)}%` }}
                    />
                    <motion.div
                      className="absolute inset-y-0.5 left-0 rounded-sm"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${p * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      style={{ background: rgb(FAMILY_CV[fam] ?? '--c-gray'), opacity: p === 0 ? 0 : 0.75 }}
                    />
                    {p === 0 && (
                      <span className="absolute inset-y-0 left-1 flex items-center font-mono2 text-[9px] text-red-300/80">
                        never moved
                      </span>
                    )}
                  </div>
                  {/* the rate in words the reader already has: a percentage, then the
                      raw counts it came from. k/n alone made every row a division problem. */}
                  <span
                    className={`w-10 shrink-0 text-right font-mono2 text-[12px] ${p === 0 ? 'text-red-300/80' : 'text-foreground/85'}`}
                  >
                    {Math.round(p * 100)}%
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono2 text-[9px] text-foreground/40">
                    moved {b.k} of {b.n}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right font-mono2 text-[9px] text-foreground/30 sm:block">
                    [{Math.round(b.lo * 100)}–{Math.round(b.hi * 100)}%]
                  </span>
                </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono2 text-[9px] text-foreground/40">
            {[...new Set(rows.map((r) => Q_FAMILY[r.q] ?? 'the scene overall'))].map((f) => (
              <span key={f}>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb(FAMILY_CV[f] ?? '--c-gray'), opacity: 0.75 }} />
                {f}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-6 border-t border-border pt-6 md:grid-cols-2">
            <div className="space-y-3 text-sm leading-6 text-foreground/70">
              <p>
                Pooled, <strong>{total.k} of {total.n}</strong> observations flipped, about{' '}
                <strong>one in {oneIn}</strong>.
              </p>
              {u12 && (
                <p className="rounded-md border border-red-400/25 bg-red-400/5 px-3 py-2">
                  The one to sit with: <strong>which continent the image looks like</strong>.{' '}
                  <strong>{u12.k} of {u12.n}</strong>, and not one was a clause working. No ladder ever aimed at it,
                  so those flips are collateral from asking for something else.
                </p>
              )}
            </div>
            <div>
              <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
                by model · same protocol, different flip rates
              </div>
              <div className="mt-3 space-y-2">
                {Object.entries(STEER_PER_MODEL).map(([m, v]) => {
                  const b = v[bucket]
                  const p = b.n ? b.k / b.n : 0
                  return (
                    <div key={m} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/50">
                        {MODEL_NAME[m as ModelId]?.replace('Stable Diffusion', 'SD') ?? m}
                      </span>
                      <div className="relative h-4 min-w-0 flex-1 rounded-sm bg-foreground/5">
                        <motion.div
                          className="absolute inset-y-0.5 left-0 rounded-sm bg-amber-300/60"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${p * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono2 text-[10px] text-foreground/50">
                        {b.k}/{b.n}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/45">
                Part of SD 2.1's lead is that its ladder was written against its own assumption list and reached
                three clauses on more pairs.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <TierNote
              tier="evidence"
              text={`${total.n} untargeted attribute observations from every counter-specified rung · ${STEER_N_CELLS} cells across ${N_LADDERS} ladders on ${N_STEER_MODELS} models, not a designed sweep; six of SD 2.1's eight ladders ship an empty switch table.`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}
