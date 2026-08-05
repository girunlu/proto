import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { rgb } from '../lib/colors'
import { Q_TEXT } from '../data/uiv2'
import { useModel, MODEL_NAME, MODELS, type ModelId } from '../data/modelContext'
import { CONSENSUS as C, PREVALENCE as P } from '../data/remedy'

const short = (m: string) => MODEL_NAME[m as ModelId]?.replace('Stable Diffusion', 'SD') ?? m

/* The unanimity histogram with the permutation null drawn behind it. The null is the
   whole point: chance alone puts ~101 slots at 7-of-7, so the observed 135 has to be
   read against that and not against zero. */
function Histogram() {
  const bars = Object.entries(C.hist).map(([k, v]) => ({ k: Number(k), v }))
  const max = Math.max(...bars.map((b) => b.v))
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {bars.map((b) => (
          <div key={b.k} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="font-mono2 text-[10px] text-foreground/50">{b.v}</span>
            <motion.div
              className="w-full rounded-t"
              initial={{ height: 0 }}
              whileInView={{ height: `${(b.v / max) * 120}px` }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: b.k * 0.04 }}
              style={{ background: b.k === 7 ? rgb('--c-em') : b.k === 1 ? rgb('--c-red') : rgb('--c-gray'), opacity: b.k === 7 || b.k === 1 ? 0.8 : 0.35 }}
            />
            <span className="font-mono2 text-[10px] text-foreground/40">{b.k}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center font-mono2 text-[9px] tracking-wider text-foreground/35 uppercase">
        how many of the seven models fill the blank the same way
      </p>
    </div>
  )
}

function NullBar({ label, t }: { label: string; t: typeof C.null.unanimous }) {
  const max = Math.max(t.observed, t.hi) * 1.15
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono2 text-[10px] text-foreground/45">
        <span>{label}</span>
        <span>
          <strong className="text-foreground/80">{t.observed}</strong> observed · {t.mean} expected by chance
        </span>
      </div>
      <div className="relative mt-1.5 h-6 rounded-sm bg-foreground/5">
        {/* the null's 95% band, drawn as the thing the observation has to beat */}
        <div
          className="absolute inset-y-0 bg-foreground/15"
          style={{ left: `${(t.lo / max) * 100}%`, width: `${((t.hi - t.lo) / max) * 100}%` }}
        />
        <motion.div
          className="absolute inset-y-1.5 left-0 rounded-sm bg-emerald-400/50"
          initial={{ width: 0 }}
          whileInView={{ width: `${(t.observed / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        />
        <div className="absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${(t.mean / max) * 100}%` }} />
      </div>
      <p className="mt-1 font-mono2 text-[9px] text-foreground/40">
        grey band = 95% of {C.null.n_perm} shuffles that keep each question's answer mix but scramble which model said
        what · excess {t.excess} · p = {t.p < 0.001 ? '< 0.001' : t.p}
      </p>
    </div>
  )
}

export default function Part7Consensus() {
  const { model } = useModel()
  const pm = C.per_model[model]
  const rows = P.per_model[model] ?? []
  const unan = C.null.unanimous

  return (
    <SceneShell
      number="VII·4"
      kicker="part vii · is it just this model? · the shared prior"
      title={<>They do not merely lean the same way. They fill the same blanks with <em className="font-display italic text-emerald-300">the same words.</em></>}
      id="xa4"
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The scene above asks a one-sided question: do <em>Stable Diffusion 2.1's</em> assumptions survive in the other
          six? That makes one model the reference frame, and a reader is entitled to ask why. So ask it symmetrically
          instead. Take every (prompt, question) blank any model fills — <strong>{C.n_slots} of them</strong> — and count
          how many of the seven fill it with the identical value.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            agreement across seven independently trained models · five developers · two architecture families
          </div>
          <div className="mt-6 grid gap-8 md:grid-cols-[1.1fr_1fr]">
            <Histogram />
            <div className="space-y-5">
              <NullBar label="all seven name the same value" t={unan} />
              <NullBar label="at least four of seven agree" t={C.null.at_least_4} />
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              <strong>{unan.observed} of {C.n_slots} blanks get the identical answer from all seven models.</strong>{' '}
              That number needs its null beside it, and this is the honest version: shuffling which model said what —
              while keeping each question's mix of answers exactly as it is — still produces about{' '}
              <strong>{unan.mean}</strong> unanimous blanks. Some of the agreement really is arithmetic, because a
              yes/no question with a lopsided answer distribution will look like consensus whatever the models do.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
              The excess above chance is <strong>{unan.excess} blanks</strong>, and it does not happen by accident
              (p {unan.p < 0.001 ? '< 0.001' : `= ${unan.p}`}). Chance-corrected across models, agreement runs at{' '}
              <strong>Gwet's AC1 = {C.ac1.weighted.toFixed(2)}</strong> over the {C.ac1.n_questions} questions where more
              than one answer was ever observed — “substantial” on the same scale, and by the same statistic, this project
              uses to decide whether two human-facing annotators may be pooled at all.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-amber-300/25 bg-amber-300/5 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-amber-200/80 uppercase">
              the result that is stronger for being a near-absence
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/75">
              Confident disagreement — two different values each named by at least two models — happens in{' '}
              <strong>{C.contradictory} of {C.n_slots} blanks</strong>, and most of those are wording rather than
              worldview (“wedding” against “dress”, “traditional” against “attire”). Seven models from five developers do
              not argue about what a wedding looks like. <strong>Switching model is not an exit either</strong> — which
              is a harder claim than the direction result above it, because that one is about which way they lean and
              this one is about what they actually say.
            </p>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-6">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            {MODEL_NAME[model]} · what it shares, what it adds, where it stands alone
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
            The page opens with <span className="font-mono2 text-[13px]">image ~ P(· | prompt, W)</span> and then never
            takes <span className="font-mono2 text-[13px]">W</span> apart. This is the decomposition:{' '}
            <span className="font-mono2 text-[13px]">W = W_shared ⊕ W_model</span>, measured.
          </p>

          {pm && (
            <div className="mt-6">
              <div className="flex h-8 overflow-hidden rounded-md">
                {([
                  ['shared', pm.shared, '--c-em', 'at least 4 of 7 agree'],
                  ['added', pm.added, '--c-amber', 'only 2–3 of 7'],
                  ['alone', pm.alone, '--c-red', 'this model alone'],
                ] as const).map(([k, v, cv, title]) => (
                  <motion.div
                    key={k}
                    className="flex items-center justify-center"
                    title={title}
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / pm.own) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    style={{ background: rgb(cv), opacity: 0.55 }}
                  >
                    <span className="font-mono2 text-[10px] text-foreground/90">{Math.round((v / pm.own) * 100)}%</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 font-mono2 text-[10px] text-foreground/45">
                <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb('--c-em'), opacity: 0.55 }} />shared with ≥3 others ({pm.shared})</span>
                <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb('--c-amber'), opacity: 0.55 }} />partly shared ({pm.added})</span>
                <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb('--c-red'), opacity: 0.55 }} />its own ({pm.alone})</span>
                <span className="text-foreground/30">of {pm.own} headline assumptions</span>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              what {MODEL_NAME[model]} assumes about <em>everything</em> · fires in N of {P.n_cells} prompts
            </div>
            <div className="mt-4 space-y-1.5">
              {rows.slice(0, 12).map((r) => (
                <div key={`${r.q}_${r.v}`} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/50" title={Q_TEXT[r.q] ?? r.q}>
                    {Q_TEXT[r.q] ?? r.q}
                  </span>
                  <span className="w-24 shrink-0 truncate font-mono2 text-[11px] text-foreground/85">{r.v}</span>
                  <div className="relative h-4 min-w-0 flex-1 rounded-sm bg-foreground/5">
                    <motion.div
                      className="absolute inset-y-0.5 left-0 rounded-sm bg-emerald-400/50"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(r.n / P.n_cells) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono2 text-[10px] text-foreground/45">
                    {r.n}/{P.n_cells}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground/70">
              This is the layer the page was missing between “here is one prompt's card list” and “here are hundreds of
              cards in total”. Read it as the model's standing view of the world: what it believes before the prompt
              narrows anything down. Every model's top row is the same one — it is always daytime.
            </p>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              the same assumptions, all seven models · read a column for a worldview, a row for the ecosystem's
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse">
                <thead>
                  <tr className="font-mono2 text-[9px] text-foreground/35">
                    <th className="w-56 pb-2 text-left font-normal">assumption</th>
                    {MODELS.map((m) => (
                      <th key={m.id} className="pb-2 text-center font-normal">
                        <span className="inline-block max-w-[4.5rem] truncate align-bottom" title={m.name}>
                          {short(m.id)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {P.matrix.map((r) => (
                    <tr key={`${r.q}_${r.v}`} className="border-t border-border/40">
                      <td className="py-1 pr-3 font-mono2 text-[10px] text-foreground/55">
                        <span className="text-foreground/35">{Q_TEXT[r.q] ?? r.q}</span> {r.v}
                      </td>
                      {MODELS.map((m) => {
                        const n = r.by_model[m.id] ?? 0
                        return (
                          <td key={m.id} className="p-0.5 text-center">
                            <div
                              className="mx-auto flex h-6 w-full items-center justify-center rounded-sm font-mono2 text-[9px]"
                              style={{
                                background: rgb('--c-em'),
                                opacity: 0.08 + (n / P.n_cells) * 0.62,
                                color: n / P.n_cells > 0.5 ? undefined : 'inherit',
                              }}
                              title={`${short(m.id)}: ${n} of ${P.n_cells} prompts`}
                            >
                              {n || ''}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <TierNote
              tier="evidence"
              text={`All seven models scored by the same single-annotator instrument, headline tier only. Agreement is chance-corrected two ways, because the raw share is not interpretable on its own: Gwet's AC1 across models (${C.ac1.weighted.toFixed(3)}, item-weighted over ${C.ac1.n_questions} questions), and a ${C.null.n_perm}-shuffle permutation null that preserves each question's answer distribution. ${Object.keys(C.ac1.single_valued).length} questions had only one value ever observed — AC1 is arithmetically 1.0 there, so they are excluded from the statistic rather than allowed to inflate it. A model missing from a blank did not settle that attribute at the gate; it is absence, not disagreement, and it is never imputed.`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}
