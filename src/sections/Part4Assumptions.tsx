import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, Picker, BarRow, MetricToggle } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { C8, COUNTRY8, SITS, CV_DEFAULT, cell, seedImg, type Sit, type Code } from '../data/part1'
import { cardsFor, CARDS_TOTAL, CARDS_HEADLINE, BLIND_SPOT, bridgeFor, CLIP_DIST } from '../data/part4'
import {
  VQA, DAAM_INDEX, daamImg, key, Q_TEXT, Q_FAMILY, type Answer,
} from '../data/uiv2'
import { useModel, modelImg, modelSeeds, modelVqa, isSd21, MODEL_NAME, CROSS_MODEL_NOTE } from '../data/modelData'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_OPTS = [
  { value: 'default' as const, label: 'no country (plain)' },
...COUNTRY8.map((c) => ({ value: c.id, label: c.name })),
]

/* ── Scene 13 · the assumptions, named (F14 + F15) ───────────────────────── */

const STRIP_N = 10

function DistributionStrip({ sit, code }: { sit: Sit; code: Code | 'default' }) {
  const { model } = useModel()
  const [showAll, setShowAll] = useState(false)
  const t = isSd21(model) ? cell(sit, code).typical_order : modelSeeds(model, sit, code, 9)
  const picks = useMemo(
    () => modelSeeds(model, sit, code, Math.min(STRIP_N, t.length)).map((seed, i) => ({ seed, rank: i })),
    [model, sit, code, t.length]
  )
  const label = `“a ${sit}${code === 'default' ? '' : ` in ${C8[code].name}`}”`
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 md:grid-cols-10">
        {(showAll ? t.map((seed, rank) => ({ seed, rank })) : picks).map((p) => (
          <ZoomImage
            key={p.seed}
            src={modelImg(model, sit, code, p.seed)}
            alt={`${sit} ${code} seed ${p.seed}`}
            caption={`${label} · seed ${p.seed} · ${p.rank + 1}th most typical of 50`}
            imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between font-mono2 text-[9px] text-foreground/35">
        <span>most typical seed</span>
        <button onClick={() => setShowAll(!showAll)} className="rounded border border-border px-2 py-0.5 text-foreground/50 transition hover:border-amber-300/50 hover:text-amber-200">
          {showAll ? '← back to a short spread' : `show all ${t.length} seeds →`}
        </button>
        <span>most unusual seed</span>
      </div>
    </div>
  )
}

/* The battery, split by the only thing the reader needs to decide about each
   row: did the model settle this question, or did it leave it open? The old
   version listed all 33 in one ramp with three tier words and no threshold
   shown, which asked the reader to infer the boundary themselves. */
const SETTLED = 0.8

function QuestionRow({ q, answers, total, cv }: { q: string; answers: Answer[]; total: number; cv: string }) {
  const top = answers[0]
  const share = top.n / total
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/50" title={Q_TEXT[q] ?? q}>
        {Q_TEXT[q] ?? q}
      </span>
      <div className="flex h-6 flex-1 overflow-hidden rounded-sm bg-foreground/8">
        <motion.div
          className="flex items-center overflow-hidden whitespace-nowrap"
          style={{ background: rgba(cv, 0.55) }}
          initial={{ width: 0 }}
          whileInView={{ width: `${share * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          title={`${top.v}: ${top.n} of ${total} images`}
        >
          <span className="pl-2 font-mono2 text-[11px] text-foreground/90">{top.v}</span>
        </motion.div>
        {/* everything the model did NOT answer, left deliberately plain */}
        <div className="flex flex-1 items-center overflow-hidden whitespace-nowrap">
          {answers.slice(1, 3).map((a) => (
            <span key={a.v} className="pl-2 font-mono2 text-[10px] text-foreground/35">{a.v} {a.n}</span>
          ))}
        </div>
      </div>
      <span className="w-16 shrink-0 text-right font-mono2 text-[11px] text-foreground/70">
        {Math.round(share * 100)}%
      </span>
    </div>
  )
}

function BatteryList({ sit, code }: { sit: Sit; code: Code | 'default' }) {
  const { model } = useModel()
  const v = modelVqa(model, sit, code)
  const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
  const rows = useMemo(() => {
    const entries = Object.entries(v?.closed ?? {}) as [string, Answer[]][]
    return entries
      .map(([q, answers]) => {
        const total = answers.reduce((a, b) => a + b.n, 0)
        return { q, answers, total, share: total ? answers[0].n / total : 0 }
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.share - a.share)
  }, [v])
  const settled = rows.filter((r) => r.share >= SETTLED)
  const open = rows.filter((r) => r.share < SETTLED)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-mono2 text-sm" style={{ color: rgb(cv) }}>
            {settled.length} of {rows.length} questions
          </span>
          <span className="font-mono2 text-[11px] text-foreground/55">
            get the same answer in at least {Math.round(SETTLED * 100)} of every 100 images.
          </span>
        </div>
        <p className="mt-1 max-w-2xl font-mono2 text-[10px] leading-4 text-foreground/40">
          Nobody asked for these. They are what the prompt left open and the model filled in anyway, the same way,
          nearly every time. This is the list the whole page is about.
        </p>
        <div className="mt-4 space-y-1.5">
          {settled.map((r) => <QuestionRow key={r.q} {...r} cv={cv} />)}
          {settled.length === 0 && (
            <p className="font-mono2 text-[11px] text-foreground/40">
              None. Every question this prompt raises is answered differently from image to image.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-mono2 text-sm text-foreground/45">the other {open.length}</span>
          <span className="font-mono2 text-[11px] text-foreground/45">genuinely vary from image to image.</span>
        </div>
        <p className="mt-1 max-w-2xl font-mono2 text-[10px] leading-4 text-foreground/35">
          Shown so you can see the contrast: this is what an unsettled question looks like, and it is the shape the
          settled rows above would have if the model had no opinion.
        </p>
        <div className="mt-4 space-y-1.5 opacity-60">
          {open.map((r) => <QuestionRow key={r.q} {...r} cv={CV_DEFAULT} />)}
        </div>
      </div>
    </div>
  )
}

/* The open questions: the annotator writes a free sentence rather than picking
   from a list. When 50 free sentences collapse into one phrase, that phrase is
   the assumption in the model's own terms. */
function OpenAnswers({ sit, code }: { sit: Sit; code: Code | 'default' }) {
  const v = VQA[key(sit, code)]
  const open = Object.entries(v?.open ?? {}) as [string, Answer[]][]
  const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
  if (!open.length) {
    return (
      <p className="font-mono2 text-[11px] text-foreground/40">
        No open-question answers survived parsing for this cell.
      </p>
    )
  }
  return (
    <div className="space-y-5">
      {open.map(([q, answers]) => {
        const total = answers.reduce((a, b) => a + b.n, 0) || 50
        return (
          <div key={q}>
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              “{Q_TEXT[q] ?? q}” · asked as a blank line, not a multiple choice
            </div>
            <div className="mt-2 space-y-1.5">
              {answers.map((a, i) => (
                <div key={a.v} className="flex items-start gap-3">
                  <div className="relative min-h-[26px] flex-1 overflow-hidden rounded-sm bg-foreground/5">
                    <motion.div
                      className="absolute inset-y-0 left-0"
                      style={{ background: rgba(cv, i === 0 ? 0.4 : 0.2) }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(a.n / total) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.06 }}
                    />
                    <span className="relative block px-2 py-1 text-[12px] leading-4 text-foreground/85">“{a.v}”</span>
                  </div>
                  <span className="w-16 shrink-0 pt-1 text-right font-mono2 text-[10px] text-foreground/50">
                    {a.n}/{total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AttentionMaps({ sit, code }: { sit: Sit; code: Code | 'default' }) {
  const [seed, setSeed] = useState(0)
  const idx = DAAM_INDEX[key(sit, code)]
  const tokens = idx?.tokens ?? []
  const n = idx?.n_seeds ?? 8
  if (!tokens.length) return null
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
          where each word of the prompt actually lands in the picture
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSeed((s) => (s - 1 + n) % n)}
            className="rounded border border-border px-2 py-0.5 font-mono2 text-[11px] text-foreground/60 transition hover:border-amber-300/50 hover:text-amber-200"
          >
            ←
          </button>
          <span className="font-mono2 text-[11px] text-foreground/55">seed {seed} of {n - 1}</span>
          <button
            onClick={() => setSeed((s) => (s + 1) % n)}
            className="rounded border border-border px-2 py-0.5 font-mono2 text-[11px] text-foreground/60 transition hover:border-amber-300/50 hover:text-amber-200"
          >
             →
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <figure className="w-40">
          <ZoomImage
            src={seedImg(sit, code, seed)}
            alt={`${sit} ${code} seed ${seed}`}
            caption={`“a ${sit}${code === 'default' ? '' : ` in ${C8[code].name}`}” · seed ${seed}`}
            imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border border-border object-cover"
          />
          <figcaption className="mt-1.5 font-mono2 text-[10px] text-foreground/50">the picture</figcaption>
        </figure>
        {tokens.map((tok) => (
          <figure key={tok} className="w-40">
            <ZoomImage
              src={daamImg(sit, code, seed, tok)}
              alt={`attention on “${tok}”, seed ${seed}`}
              caption={`attention on the word “${tok}” · seed ${seed}`}
              imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border border-border object-cover"
            />
            <figcaption className="mt-1.5 font-mono2 text-[10px] text-amber-200">“{tok}”</figcaption>
          </figure>
        ))}
        <p className="max-w-[220px] text-[12px] leading-5 text-foreground/50">
          Bright regions are where that single word of the prompt is being attended to while the picture is drawn.
          Step through the seeds: the country word does not land on a flag or a map, it spreads across the clothing,
          the crowd and the venue. That is the payload.
        </p>
      </div>
    </div>
  )
}

function NamedScene() {
  const { model } = useModel()
  const [sit, setSit] = useState<Sit>('wedding')
  const [code, setCode] = useState<Code | 'default'>('NG')
  const [showDaam, setShowDaam] = useState(false)
  const cards = cardsFor(sit, code)
  const headlineCards = cards.filter((c) => c.tier === 'headline')
  const cellData = cell(sit, code)

  return (
    <SceneShell
      number="13"
      kicker="Part IV · the assumptions, named · findings 14–15"
      title={<>Named, not implied, <em className="font-display italic text-amber-200">with the distribution they describe.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Distances establish <em>that</em> the unspecified gets supplied. This establishes <em>with what</em>. Every
          generated image is shown to a vision-language model that never sees the prompt behind it, and asked the same
          frozen list of 33 questions: indoors or outdoors, how many people, what are they wearing, what kind of
          building. When 50 blind answers agree, the model has an assumption. That yields{' '}
          <strong>{CARDS_HEADLINE} firm assumptions across the 54 prompts ({CARDS_TOTAL} counting the weaker
          tier)</strong>.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <Picker label="event" value={sit} onChange={setSit} options={SIT_OPTS} />
            <Picker
              label="country"
              value={code}
              onChange={setCode}
              options={CODE_OPTS}
              accent={code === 'default' ? undefined : C8[code].cv}
            />
            {isSd21(model) && (
              <label className="flex cursor-pointer items-center gap-2 self-end pb-1.5 font-mono2 text-[10px] text-foreground/50">
                <input type="checkbox" checked={showDaam} onChange={(e) => setShowDaam(e.target.checked)} className="accent-amber-300" />
                show attention maps
              </label>
            )}
          </div>
          {!isSd21(model) && (
            <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/50">
              Showing <span className="text-amber-200">{MODEL_NAME[model]}</span>: its own images and its own answers
              to the same frozen questionnaire. {CROSS_MODEL_NOTE} The open-question wording and the attention maps
              below were only produced for Stable Diffusion 2.1.
            </p>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                “a {sit}{code === 'default' ? '' : ` in ${C8[code].name}`}” · what it draws
              </div>
              <span className="font-mono2 text-[10px] text-foreground/40">
                {cellData.headline_n} firm · {cellData.secondary_n} weaker
              </span>
            </div>
            <div className="mt-3">
              <DistributionStrip sit={sit} code={code} />
            </div>
          </div>

          {showDaam && isSd21(model) && (
            <div className="mt-6 rounded-lg border border-border p-4">
              <AttentionMaps sit={sit} code={code} />
            </div>
          )}

          <div className="mt-8 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              the frozen battery, answered blind over all 50 seeds
            </div>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-foreground/50">
              One row per question. The bar is the full spread of answers across the 50 images, widest answer first.
              A row marked <span className="text-amber-200">named</span> is one where agreement is high enough to call
              it an assumption rather than a tendency.
            </p>
            <div className="mt-4">
              <BatteryList sit={sit} code={code} />
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              and in the annotator's own words
            </div>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-foreground/50">
              Four of the 33 questions have no answer list at all: the annotator writes a sentence. Those sentences
              are where the assumption stops being a checkbox and becomes a description. When 50 independent
              descriptions of 50 different images converge on one phrase, that phrase is the stereotype, written out in full.
            </p>
            <div className="mt-5">
              {isSd21(model) ? (
                <OpenAnswers sit={sit} code={code} />
              ) : (
                <p className="font-mono2 text-[11px] leading-5 text-foreground/45">
                  The free-text questions were only transcribed for Stable Diffusion 2.1. Switch back to it to read
                  the sentences.
                </p>
              )}
            </div>
          </div>

          {headlineCards.length === 0 && (
            <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/5 p-6">
              <div className="font-mono2 text-xs tracking-widest text-amber-200/80 uppercase">
                nothing is named here, and that is itself the finding
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
                “A {sit}{code === 'default' ? '' : ` in ${C8[code].name}`}” surfaces no firm assumptions. Not because
                it carries none: the detector clears its agreement bar more easily on an already-collapsed stereotype
                than on a varied baseline. The default world needs no naming. Look at the images above; the
                assumptions are plainly there even where no row fires.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-red-400/25 bg-red-400/5 p-4">
            <div className="font-mono2 text-[10px] tracking-widest text-red-300/80 uppercase">
              the caveat that rides on every count on this page
            </div>
            <p className="mt-2 font-mono2 text-[11px] leading-5 text-foreground/60">{BLIND_SPOT}</p>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <TierNote
              tier="evidence"
              text="Answers come from two independent vision-language annotators over 50 seeds per cell, kept only where the two agree well enough to be worth reporting. The image strip is real seeds evenly spaced across the cell's typicality order: the honest spread, not a curated best-of."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 14 · cards carry the geometry (F16) ───────────────────────────── */

function BridgeScene() {
  const [sit, setSit] = useState<Sit>('wedding')
  const [code, setCode] = useState<Code>('NG')
  const data = bridgeFor(sit, code)
  const v = VQA[key(sit, code)]

  /* group the per-question weights into the handful of families a reader can
     actually hold in their head, and carry a real example into each label */
  const families = useMemo(() => {
    if (!data) return []
    const m = new Map<string, { share: number; qs: { q: string; eta2: number; value?: string }[] }>()
    data.rows.forEach((r) => {
      const fam = Q_FAMILY[r.q] ?? 'other'
      const cur = m.get(fam) ?? { share: 0, qs: [] }
      const top = v?.closed?.[r.q]?.[0]?.v ?? v?.open?.[r.q]?.[0]?.v
      cur.share += r.eta2
      cur.qs.push({ q: r.q, eta2: r.eta2, value: top })
      m.set(fam, cur)
    })
    const rows = [...m.entries()].map(([fam, x]) => ({ fam,...x, qs: x.qs.sort((a, b) => b.eta2 - a.eta2) }))
    return rows.sort((a, b) => b.share - a.share)
  }, [data, v])
  const maxShare = families[0]?.share ?? 1

  return (
    <SceneShell
      number="14"
      kicker="Part IV · the assumptions, named · finding 16"
      title={<>The named assumptions <em className="font-display italic text-amber-200">are</em> the distance.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Two separate instruments have been used so far: a geometric one that measures how far apart two sets of
          pictures sit, and a linguistic one that names what is in them. Do they agree? Take the measured gap and ask
          how much of it each named attribute accounts for. The words and the geometry turn out to be describing the
          same thing.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <Picker label="event" value={sit} onChange={setSit} options={SIT_OPTS} />
            <Picker label="country" value={code} onChange={setCode} options={CODE_OPTS.slice(1) as { value: Code; label: string }[]} accent={C8[code].cv} />
          </div>
          {data && (
            <>
              <div className="mt-6 font-mono2 text-[11px] text-foreground/50">
                the gap being explained: <strong className="text-foreground">{data.distance.toFixed(3)}</strong>{' '}
                between “a {sit}” and “a {sit} in {C8[code].name}”
              </div>
              <div className="mt-5 space-y-5">
                {families.map((f, i) => (
                  <div key={f.fam}>
                    <div className="flex items-center gap-3">
                      <span className="w-44 shrink-0 text-right font-mono2 text-[12px] leading-4 text-foreground/75">
                        {f.fam}
                      </span>
                      <div className="relative h-7 flex-1">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{ background: `linear-gradient(90deg, ${rgba(C8[code].cv, 0.25)}, ${rgb(C8[code].cv)})` }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(f.share / maxShare) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, delay: i * 0.06 }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right font-mono2 text-[12px]" style={{ color: rgb(C8[code].cv) }}>
                        {(f.share * data.distance).toFixed(2)}
                        <span className="text-foreground/35"> of {data.distance.toFixed(2)}</span>
                      </span>
                    </div>
                    {/* the actual answers, as readable chips rather than a grey run-on line */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[12.5rem]">
                      {f.qs.filter((q) => q.value).slice(0, 3).map((q) => (
                        <span
                          key={q.q}
                          className="rounded-md border px-2 py-1 font-mono2 text-[11px]"
                          style={{ borderColor: rgba(C8[code].cv, 0.35), background: rgba(C8[code].cv, 0.07) }}
                        >
                          <span className="text-foreground/45">{Q_TEXT[q.q] ?? q.q}</span>
                          <span className="text-foreground/30"> → </span>
                          <span className="text-foreground/90">{q.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-8 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text="For each question we measure how much of the seed-to-seed variation in distance it accounts for, then group the questions into the families above and scale by the measured gap. This attributes the gap; it is not a second, independent measurement of it."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 15 · not a single-ruler artifact (F17) ────────────────────────── */

function RulerScene() {
  const [sit, setSit] = useState<Sit>('wedding')
  const [ruler, setRuler] = useState<'dinov3' | 'clip'>('dinov3')
  const max = 0.7
  return (
    <SceneShell
      number="15"
      kicker="Part IV · the assumptions, named · finding 17"
      title={<>Not an artefact of <em className="font-display italic text-amber-200">one measuring stick.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Every distance so far came from one vision model, DINOv3. A reasonable worry is that the pattern lives in
          that measuring stick rather than in the pictures. So we measured everything again with CLIP, a completely
          differently trained model, and the ordering survives. Flip the switch below.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <Picker label="event" value={sit} onChange={setSit} options={SIT_OPTS} />
            <MetricToggle value={ruler} onChange={setRuler} />
          </div>
          <div className="mt-8 space-y-2.5">
            {COUNTRY8.map((c, i) => {
              const d = ruler === 'dinov3' ? cell(sit, c.id).dist! : CLIP_DIST[sit][c.id]
              return (
                <BarRow
                  key={c.id}
                  label={c.name}
                  value={d.mean}
                  ci={[d.ci_low, d.ci_high]}
                  max={max}
                  color={c.cv}
                  delay={i * 0.04}
                />
              )
            })}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-32 shrink-0" />
              <span className="flex-1 font-mono2 text-[10px] text-foreground/35">
                distance from “a {sit}” · the bracket through each bar is the range the true value very likely falls in
              </span>
              <span className="w-14 shrink-0" />
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text="Same 50 seeds, same protocol, same confidence intervals, measured once with each of the two vision models. Both the Western-default gradient and the variety collapse hold under either one."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Part IV ─────────────────────────────────────────────────────────────── */

export default function Part4Assumptions() {
  return (
    <>
      <NamedScene />
      <BridgeScene />
      <RulerScene />
    </>
  )
}
