import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote, InfoBox } from '../components/Scene'
import { ZoomImage, BoxPicker } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { ordinal } from '../lib/utils'
import { C8, COUNTRY8, SITS, CV_DEFAULT, cell, seedImg, type Sit, type Code } from '../data/part1'
import { cardsFor, CARDS_TOTAL, CARDS_HEADLINE, CARDS_CANDIDATES, BLIND_SPOT } from '../data/part4'
import {
  VQA, DAAM_INDEX, daamImg, key, Q_TEXT, BATTERY, tidyOpen, FORCED_CELLS, FORCED_U12,
  type Answer, type ForcedQ,
} from '../data/uiv2'
import { useModel, modelImg, modelSeeds, seedCount, modelVqa, isSd21, MODEL_NAME, CROSS_MODEL_NOTE } from '../data/modelData'
import { openForModel, shiftFor, type ShiftRow } from '../data/crossmodel'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_OPTS = [
  { value: 'default' as const, label: 'default prompt' },
...COUNTRY8.map((c) => ({ value: c.id, label: c.name, cv: c.cv })),
]

/* ── Scene 05 · the assumptions, named (F14 + F15) ───────────────────────── */

const STRIP_N = 10

function DistributionStrip({ sit, code }: { sit: Sit; code: Code | 'default' }) {
  const { model } = useModel()
  const [showAll, setShowAll] = useState(false)
  const t = modelSeeds(model, sit, code, seedCount(model, sit, code))
  /* rank is the seed's position in the cell's own typicality order, not its
     position in this strip: the strip is a 10-wide spread across all of `t`, so
     calling its 3rd tile "3rd most typical" was wrong for every model. */
  const picks = useMemo(() => {
    const k = Math.min(STRIP_N, t.length)
    if (k < 2) return t.slice(0, k).map((seed, i) => ({ seed, rank: i }))
    return Array.from({ length: k }, (_, i) => {
      const rank = Math.round((i * (t.length - 1)) / (k - 1))
      return { seed: t[rank], rank }
    })
  }, [t])
  const label = `“a ${sit}${code === 'default' ? '' : ` in ${C8[code].name}`}”`
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 md:grid-cols-10">
        {(showAll ? t.map((seed, rank) => ({ seed, rank })) : picks).map((p) => (
          <ZoomImage
            key={p.seed}
            src={modelImg(model, sit, code, p.seed)}
            alt={`${sit} ${code} seed ${p.seed}`}
            caption={`${label} · ${MODEL_NAME[model]} · seed ${p.seed} · ${ordinal(p.rank + 1)} most typical of ${t.length}${isSd21(model) ? '' : ' published'}`}
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
/* how many open-answer clusters get their own bar before the tail is folded */
const OPEN_SHOWN = 4

function QuestionRow({ q, answers, total, cv, settled }: { q: string; answers: Answer[]; total: number; cv: string; settled?: boolean }) {
  const top = answers[0]
  const share = top.n / total
  return (
    <div className="flex items-center gap-3">
      {/* the settled/unsettled state is a mark on the row, not a change of position:
          rows are in a fixed order so the same question is always in the same place
          when you switch event or country. */}
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${settled ? '' : 'opacity-0'}`}
        style={settled ? { background: rgb(cv) } : undefined}
        aria-hidden
      />
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

/* Fixed row order, always. The list used to sort by agreement share, so the same
   question sat in a different place for every event and country and nothing could be
   compared by eye — switching the picker made every row jump. Q_TEXT's own declaration
   order is the canonical one (the universal questions first, then the event-specific
   module), so a shared question is always at the same index and only its bar changes. */
const Q_ORDER = Object.keys(Q_TEXT)
const qRank = (q: string) => {
  const i = Q_ORDER.indexOf(q)
  return i === -1 ? Q_ORDER.length : i
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
      .sort((a, b) => qRank(a.q) - qRank(b.q))
  }, [v])
  const settledCount = rows.filter((r) => r.share >= SETTLED).length

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-mono2 text-sm" style={{ color: rgb(cv) }}>
          {settledCount} of {rows.length} questions
        </span>
        <span className="font-mono2 text-[11px] text-foreground/55">
          get the same answer in at least {Math.round(SETTLED * 100)} of every 100 images.
        </span>
      </div>
      <p className="mt-1 max-w-2xl font-mono2 text-[10px] leading-4 text-foreground/40">
        What the prompt left open, the model filled in anyway: the dotted rows, the same way nearly every time.
      </p>
      <div className="mt-4 space-y-1.5">
        {rows.map((r) => (
          <QuestionRow key={r.q} {...r} cv={r.share >= SETTLED ? cv : CV_DEFAULT} settled={r.share >= SETTLED} />
        ))}
        {rows.length === 0 && (
          <p className="font-mono2 text-[11px] text-foreground/40">No answers recorded for this prompt.</p>
        )}
      </div>
    </div>
  )
}

/* The open questions: the annotator writes a free sentence rather than picking
   from a list. When 50 free sentences collapse into one phrase, that phrase is
   the assumption in the model's own terms. */
function OpenAnswers({ sit, code }: { sit: Sit; code: Code | 'default' }) {
  const { model } = useModel()
  /* Tier C: the categorised free-text answers were exported for all seven models.
     One annotator throughout, since the second was retired. */
  /* tidyOpen drops the annotator's non-answers and merges clusters that are the
     same idea in different words — see uiv2.ts. Questions left with nothing after
     that are dropped rather than shown as an empty row. */
  const open = (Object.entries(
    (isSd21(model) ? VQA[key(sit, code)]?.open : openForModel(model, sit, code)) ?? {}
  ) as [string, Answer[]][])
    .map(([q, answers]) => [q, tidyOpen(answers)] as [string, Answer[]])
    .filter(([, answers]) => answers.length > 0)
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
      {open.map(([q, all]) => {
        const total = all.reduce((a, b) => a + b.n, 0) || 50
        /* Three open questions x every cluster was up to 16 bars a cell, on top of the
           battery's 18 rows — a wall nobody reads. The long tail is folded into one
           row so the count still adds up to 50 and nothing is quietly dropped. */
        const answers = all.slice(0, OPEN_SHOWN)
        const tail = all.slice(OPEN_SHOWN)
        const tailN = tail.reduce((a, b) => a + b.n, 0)
        return (
          <div key={q}>
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              “{Q_TEXT[q] ?? q}” · asked as a blank line
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
              {tail.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="relative min-h-[26px] flex-1 overflow-hidden rounded-sm bg-foreground/5">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ background: rgba(CV_DEFAULT, 0.14), width: `${(tailN / total) * 100}%` }}
                    />
                    <span className="relative block px-2 py-1 text-[12px] leading-4 text-foreground/45">
                      {tail.length} smaller answers, none repeated more than {tail[0].n} times
                    </span>
                  </div>
                  <span className="w-16 shrink-0 pt-1 text-right font-mono2 text-[10px] text-foreground/40">
                    {tailN}/{total}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* The forced-choice control, shown BESIDE the battery and never instead of it.
   Only renders where the annotator actually refused something on this cell, and only
   on SD 2.1 — the re-ask was run over the main run's images, so showing it under
   another model's name would be the exact class of error UI_MAP §5 exists to stop. */
function ForcedControl({ sit, code }: { sit: Sit; code: Code | 'default' }) {
  const { model } = useModel()
  if (!isSd21(model)) return null
  const cellKey = key(sit, code)
  const rows = Object.entries(FORCED_CELLS[cellKey] ?? {}) as [string, ForcedQ][]
  if (!rows.length) return null
  const asked = rows.reduce((a, [, v]) => a + v.n, 0)
  const refused = rows.reduce((a, [, v]) => a + v.refused, 0)

  return (
    <div className="mt-8 rounded-lg border border-sky-300/25 bg-sky-300/[0.04] p-4">
      <div className="font-mono2 text-[10px] tracking-widest text-sky-200/80 uppercase">
        a second instrument · the same images, asked again without “unclear”
      </div>
      <p className="mt-2 max-w-3xl text-[13px] leading-5 text-foreground/60">
        <strong>{asked}</strong> answers above were “unclear”; re-asking without that option can only push
        agreement up, so these never replace the numbers above. What they test is whether the model was being
        careful or merely quiet:{' '}
        <strong className="text-foreground/80">
          it refused again {refused} of {asked} times
        </strong>
        {refused > 0 && ', often by writing “n-a”, a reply that was never on the list'}.
      </p>
      <div className="mt-3 space-y-1">
        {rows.map(([q, v]) => (
          <div key={q} className="flex items-center gap-3 font-mono2 text-[10px]">
            <span className="w-40 shrink-0 truncate text-right text-foreground/50" title={Q_TEXT[q] ?? q}>
              {Q_TEXT[q] ?? q}
            </span>
            <span className="w-24 shrink-0 truncate text-foreground/35">was “{v.was ?? 'unclear'}”</span>
            <span className="min-w-0 flex-1 truncate text-foreground/85">
              → {v.top.map((t) => `${t.v} ${t.n}`).join(' · ')}
            </span>
            <span className="w-24 shrink-0 text-right text-foreground/40">
              {v.refused}/{v.n} refused again
            </span>
          </div>
        ))}
      </div>
      {FORCED_U12.plain && FORCED_U12.non_western && (
        <p className="mt-3 border-t border-sky-300/20 pt-2.5 text-[12px] leading-5 text-foreground/55">
          Forced to name a continent, the default prompt says{' '}
          <strong className="text-foreground/80">Europe or North America</strong> in{' '}
          {Math.round((FORCED_U12.plain.west_share_of_named ?? 0) * 100)}% of the answers that named one. Prompts
          naming a non-Western country land on a non-Western continent{' '}
          {100 - Math.round((FORCED_U12.non_western.west_share_of_named ?? 0) * 100)}% of the time. The model can
          read the pictures; on the default prompt what it reads is Western.
        </p>
      )}
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
          Bright is where that word is attended. The country word lands not on a flag or a map but across the
          clothing, the crowd and the venue. That is the payload.
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
      number="05"
      kicker="Part II · the assumptions, named · findings 14–15"
      title={<>Named, not implied, <em className="font-display italic text-amber-200">with the distribution they describe.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Distances establish <em>that</em> the unspecified gets supplied; this establishes <em>with what</em>. A
          vision-language model that never sees the prompt answers the same frozen questionnaire over every image
          ({BATTERY.universal} questions for all, {BATTERY.perCellMin}–{BATTERY.perCellMax} per prompt,{' '}
          {BATTERY.distinct} distinct across the study). When 50 blind answers clear the same agreement floor, that
          is an assumption:{' '}
          <strong>{CARDS_HEADLINE} firm ones across the 54 prompts ({CARDS_TOTAL} counting the weaker tier)</strong>,
          filtered from all {CARDS_CANDIDATES} the detector proposed.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 max-w-2xl">
          <InfoBox title="technical detail · the blind questionnaire">
            Annotator: one vision-language model (gemma4), shown each image without ever seeing the prompt, answering a frozen battery: 13 questions in every cell, 17–18 per cell. An answer covering ≥ 80% of a cell's 50 images names an assumption. All seven models were annotated under this identical setup, so cells are comparable across models.
          </InfoBox>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          {/* two rows of boxes rather than two dropdowns: the whole 6 × 9 grid of
              prompts is visible, and moving along one row is a single click */}
          <div className="flex flex-col gap-2.5">
            <BoxPicker label="event" value={sit} onChange={setSit} options={SIT_OPTS} size="sm" />
            <BoxPicker label="country" value={code} onChange={setCode} options={CODE_OPTS} size="sm" />
            {isSd21(model) && (
              <label className="flex cursor-pointer items-center gap-2 self-end pb-1.5 font-mono2 text-[10px] text-foreground/50">
                <input type="checkbox" checked={showDaam} onChange={(e) => setShowDaam(e.target.checked)} className="accent-amber-300" />
                show attention maps
              </label>
            )}
          </div>
          {!isSd21(model) && (
            <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/50">
              Showing <span className="text-amber-200">{MODEL_NAME[model]}</span>'s own images and answers to the
              same questionnaire. {CROSS_MODEL_NOTE} The attention maps exist only for Stable Diffusion 2.1. They
              read that model's own cross-attention, so there is nothing to switch.
            </p>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                “a {sit}{code === 'default' ? '' : ` in ${C8[code].name}`}” · what it generates
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
            <div className="mt-2 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              the frozen battery, answered blind over all 50 seeds
            </div>
            <div className="mt-4">
              <BatteryList sit={sit} code={code} />
            </div>
            <ForcedControl sit={sit} code={code} />
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              and in the annotator's own words
            </div>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-foreground/50">
              Three questions have no answer list (clothing, objects, setting), so the annotator writes a
              sentence. When 50 independent descriptions converge on one phrase, that phrase is the stereotype,
              written out in full.
            </p>
            <div className="mt-5">
              <OpenAnswers sit={sit} code={code} />
            </div>
          </div>

          {headlineCards.length === 0 && (
            <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/5 p-6">
              <div className="font-mono2 text-xs tracking-widest text-amber-200/80 uppercase">
                nothing is named here, and that is itself the finding
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
                “A {sit}{code === 'default' ? '' : ` in ${C8[code].name}`}” surfaces no firm assumptions, not
                because it carries none: the detector clears its agreement bar more easily on an already-collapsed
                stereotype than on a varied baseline. The assumptions are there in the images above even where no
                row fires.
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
              text={`One vision-language annotator over 50 seeds per cell, kept only where enough of the 50 agree; the image strip is real seeds evenly spaced across the cell's typicality order.${isSd21(model) ? '' : ' For the other six models the strip spans the 24 seeds with published thumbnails, not all 50.'}`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 06 · cards carry the geometry (F16) ───────────────────────────── */

/* one attribute's contribution to the default→country movement. The plain answer is
   shown next to the country answer on every row, because the single most useful
   thing a reader can see here is how often they are the same. */
/* Half of all rows sit under 0.1 — up to 15 in a single cell — and a stack of
   near-empty bars made this scene long without making it clearer. They are drawn as a
   bag of words instead: every attribute still named, with its own share, at the same
   text weight as everything else. The point is saving vertical space, NOT demoting
   them — a 10px muted line reads as hiding something, which is the opposite of what
   this page does with small numbers. */
const MINOR = 0.1

function MinorRow({ rows, label, cv }: { rows: ShiftRow[]; label: string; cv: string }) {
  if (!rows.length) return null
  return (
    <div className="mt-3">
      <div className="font-mono2 text-[10px] leading-4 text-foreground/50">
        <span className="text-foreground/70">{rows.length} under {Math.round(MINOR * 100)}%</span> · {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span
            key={r.q}
            className="inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 font-mono2 text-[11px]"
            style={{ borderColor: rgba(cv, 0.3), background: rgba(cv, 0.06) }}
          >
            <span className="text-foreground/50">{Q_TEXT[r.q] ?? r.q}</span>
            {/* the answer itself, not just the question — a bag of attribute NAMES
                tells you what was measured, never what the model actually decided */}
            {r.plain === r.value ? (
              <span className="text-foreground/90">{r.value}</span>
            ) : (
              <span className="text-foreground/90">
                <span className="text-foreground/40 line-through">{r.plain}</span> → {r.value}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function ShiftBar({ r, i, maxShare, cv, muted }: {
  r: ShiftRow
  i: number
  maxShare: number
  cv: string
  muted?: boolean
}) {
  const same = r.plain === r.value
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-right font-mono2 text-[11px] leading-4 text-foreground/70">
        {Q_TEXT[r.q] ?? r.q}
      </span>
      <div className="relative h-6 flex-1 rounded-sm bg-foreground/[0.05]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{
            background: muted
              ? rgba(cv, 0.22)
              : `linear-gradient(90deg, ${rgba(cv, 0.3)}, ${rgb(cv)})`,
          }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(0, (r.share / maxShare)) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.04 }}
        />
      </div>
      <span
        className="w-12 shrink-0 text-right font-mono2 text-[11px]"
        style={{ color: muted ? undefined : rgb(cv) }}
      >
        {r.share.toFixed(2)}
      </span>
      <span className="w-52 shrink-0 font-mono2 text-[10px] leading-4 text-foreground/45">
        {same ? (
          <>
            <span className="text-foreground/70">{r.value}</span> in both
          </>
        ) : (
          <>
            {r.plain} <span className="text-foreground/30">→</span>{' '}
            <span className="text-foreground/80">{r.value}</span>
          </>
        )}
      </span>
    </div>
  )
}

function BridgeScene() {
  const { model } = useModel()
  const [sit, setSit] = useState<Sit>('wedding')
  const [code, setCode] = useState<Code>('NG')
  /* Rebuilt 2026-07-30 on the between-cell measure. What this scene drew before was
     η²: within the country cell, how much of the seed-to-seed variation in distance
     an attribute's answer explained. That never compared the two prompts' answers,
     so an attribute with the SAME answer in both could top the chart off two stray
     seeds — and one that was constant across all 50 seeds was dropped entirely.
     `share` is the fraction of the default→country movement predicted by this
     attribute's ANSWER DISTRIBUTION changing — not by its majority label flipping.
     Those are different things: 2,845 of the 3,597 rows whose top answer is identical
     in both prompts still carry a share, one as high as 0.70, because the split
     underneath the winner moved. Do not re-introduce the old comment claiming
     "no change reads as ~0"; it is false and it is what made this chart confusing. */
  const data = shiftFor(model, sit, code)
  const rows = data?.rows ?? []
  /* the tautological rows are separated out rather than hidden: when a country prompt
     moves apparent continent from Europe to Africa, that attribute's answer groups ARE
     the two prompts, so its share is forced toward 1 and it evidences nothing */
  const real = rows.filter((r) => !r.sep)
  const tautological = rows.filter((r) => r.sep)
  const moved = real.filter((r) => r.plain !== r.value && r.share >= MINOR)
  const movedMinor = real.filter((r) => r.plain !== r.value && r.share < MINOR)
  const still = real.filter((r) => r.plain === r.value && r.share >= MINOR)
  const stillMinor = real.filter((r) => r.plain === r.value && r.share < MINOR)
  const taut = tautological.filter((r) => r.share >= MINOR)
  const tautMinor = tautological.filter((r) => r.share < MINOR)
  const maxShare = Math.max(1, ...rows.map((r) => r.share))

  return (
    <SceneShell
      number="06"
      kicker="Part II · the assumptions, named · finding 16"
      title={<>The assumptions that <em className="font-display italic text-amber-200">change</em> are the distance.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          One instrument measures how far apart two sets of pictures sit; the other names what is in them. Do they
          agree? For each attribute, take its answers under the default prompt and under the country prompt, and ask
          how much of the measured movement between the two its change in answers alone would predict: an attribute
          that answers the same way in both should score nothing.
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mt-6 max-w-2xl">
          <InfoBox title="technical detail · how the shares are computed">
            Per attribute, the answer marginals of the default and country-named cells (50 + 50 images, DINOv3 geometry) are compared, and an attribute's share is the fraction of the between-cell distance its changed answers account for. Shares deliberately do not sum to 1: attributes are not independent, and the decomposition is not an independent measurement of the distance.
          </InfoBox>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <BoxPicker label="event" value={sit} onChange={setSit} options={SIT_OPTS} size="sm" />
            <BoxPicker label="country" value={code} onChange={setCode} options={CODE_OPTS.slice(1) as { value: Code; label: string; cv: string }[]} size="sm" />
          </div>
          {!data && (
            <p className="mt-4 font-mono2 text-[11px] leading-5 text-foreground/50">
              No decomposition for “a {sit} in {C8[code].name}” on {MODEL_NAME[model]}: no annotator's answers
              survived the mapping gate for this cell. Pick another cell, or another model.
            </p>
          )}
          {data && (
            <>
              <div className="mt-6 font-mono2 text-[11px] leading-5 text-foreground/50">
                the movement being explained: <strong className="text-foreground">{data.distance.toFixed(3)}</strong>{' '}
                between “a {sit}” and “a {sit} in {C8[code].name}”
              </div>

              <div className="mt-6 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                attributes whose answer changed · {moved.length + movedMinor.length} of {real.length}
              </div>
              <div className="mt-3 space-y-2.5">
                {moved.map((r, i) => (
                  <ShiftBar key={r.q} r={r} i={i} maxShare={maxShare} cv={C8[code].cv} />
                ))}
              </div>
              <MinorRow rows={movedMinor} label="changed, but barely carry the movement" cv={C8[code].cv} />

              <div className="mt-7 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                attributes whose answer did not change · {still.length + stillMinor.length} of {real.length}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/60">
                <strong className="text-foreground/80">A bar here is not a contradiction.</strong> The measure reads
                the whole answer distribution, not just the winner. The top answer can stay while images change
                sides underneath it. The country word re-weighted what was already true of “a {sit}” rather than
                introducing it.
              </p>
              <div className="mt-3 space-y-2.5">
                {still.map((r, i) => (
                  <ShiftBar key={r.q} r={r} i={i} maxShare={maxShare} cv={C8[code].cv} muted />
                ))}
              </div>
              <MinorRow rows={stillMinor} label="same answer, and the split barely moved either" cv={C8[code].cv} />

              {tautological.length > 0 && (
                <>
                  <div className="mt-7 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                    true but circular · {tautological.length}
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {taut.map((r, i) => (
                      <ShiftBar key={r.q} r={r} i={i} maxShare={maxShare} cv={C8[code].cv} muted />
                    ))}
                  </div>
                  <MinorRow rows={tautMinor} label="circular, and small anyway" cv={C8[code].cv} />
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
                    Here the answer groups simply <em>are</em> the two sets of pictures, so the share is forced
                    towards 1, scored high, evidencing nothing.
                  </p>
                </>
              )}
            </>
          )}
          <div className="mt-8 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text={`Each bar is the share of the default→country movement predicted from one attribute's answer proportions over the pooled 50+50 images, DINOv3 embeddings, ${MODEL_NAME[model]}'s own answers${isSd21(model) ? '' : `, from the cross-model run: ${CROSS_MODEL_NOTE.charAt(0).toLowerCase()}${CROSS_MODEL_NOTE.slice(1)}`}. Shares are per attribute and deliberately do not sum to 1.`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 15 (F17, "not one measuring stick") was cut on 2026-07-30 ───────────
   Every distance chart now carries its own DINOv3 / CLIP toggle, so a whole scene
   whose only job was to flip that switch once was saying nothing the reader could
   not already do in place. The claim itself survives in the Closing methods panel
   ("nothing rests on one measuring stick"). */

/* ── Part II ─────────────────────────────────────────────────────────────── */

export default function Part4Assumptions() {
  return (
    <>
      <NamedScene />
      <BridgeScene />
    </>
  )
}
