import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, BoxPicker, RepoLink, Cite } from '../components/Viz'
import { ANNOTATOR } from '../data/references'
import { rgb, rgba } from '../lib/colors'
import { ordinal } from '../lib/utils'
import { C8, COUNTRY8, SITS, CV_DEFAULT, cell, seedImg, type Sit, type Code } from '../data/part1'
/* CARDS_CANDIDATES is no longer imported: it equals CARDS_TOTAL (708 of 708 clear
   the consistency floor, since the two-annotator agreement gate that used to reject
   some of them is gone), so the sentence "…from 708 the detector proposed" was
   comparing a number with itself. */
import { cardsFor, CARDS_TOTAL, CARDS_HEADLINE } from '../data/part4'
import {
  VQA, DAAM_INDEX, daamImg, key, Q_TEXT, BATTERY, tidyOpen,
  type Answer,
} from '../data/uiv2'
import { useModel, modelImg, modelSeeds, seedCount, modelVqa, isSd21, MODEL_NAME, CROSS_MODEL_NOTE } from '../data/modelData'
import { openForModel, shiftFor, type ShiftRow } from '../data/crossmodel'
import { STATS } from '../data/research'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_OPTS = [
  { value: 'default' as const, label: 'unspecified prompt' },
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
/* the weaker tier's floor, verified against attribute_summary.json: headline cards
   run 0.800–1.000 consistency, secondary 0.600–0.780 */
const SECONDARY = 0.6
/* how many open-answer clusters get their own bar before the tail is folded */
const OPEN_SHOWN = 4

function QuestionRow({ q, answers, total, cv }: { q: string; answers: Answer[]; total: number; cv: string }) {
  const top = answers[0]
  const share = top.n / total
  return (
    <div className="flex items-center gap-3">
      {/* The settled-state dot that sat here was removed 2026-08-10 (Giray). Rows
          stay in a fixed order so the same question is always in the same place when
          you switch event or country; settled is now carried by the bar's colour
          alone (the country hue when settled, the default hue when not). */}
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
        What the prompt left open, the model filled in anyway, the same way nearly every time.
      </p>
      <div className="mt-4 space-y-1.5">
        {rows.map((r) => (
          <QuestionRow key={r.q} {...r} cv={r.share >= SETTLED ? cv : CV_DEFAULT} />
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

/* The forced-choice control ("a second instrument · the same images, asked again
   without 'unclear'") is REMOVED 2026-08-11 (Giray), along with its sky-tinted
   panel. It re-asked the refused questions with the "unclear" option withheld and
   reported how often the annotator refused anyway. uiv2's FORCED_CELLS and
   FORCED_U12 still carry the data if it is ever wanted back. */

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
      number="07"
      kicker="the named concepts"
      title={<>Named, not implied, <em className="font-display italic text-amber-200">with the distribution they describe.</em></>}
    >
      <Reveal>
        {/* The example question is quoted as the battery actually asks it (W4, "is
            food visible"), not as "Is there food?": the figure below lists the battery
            by these same labels, so a paraphrase here would not match any row the
            reader can see. */}
        <p className="prose-scene max-w-2xl">
          For this experiment, we use <RepoLink m={ANNOTATOR} /> <Cite ids={['gemma2026']} /> as a visual annotator. For each prompt, the annotator is
          shown each generated image and answers a fixed set of questions, each addressing one semantic concept, for
          example, “Is food visible?” where food is the semantic concept. Then we aggregate the answers across the
          prompt images.
        </p>
        {/* Rewritten 2026-08-11 (Giray). "Where 50 answers converge" named no
            threshold, and "the weaker tier" was defined nowhere on the page once the
            Setup blocks went. Both floors are now stated as a count of images, and
            the totals are scoped to SD 2.1, which is whose table they come from. */}
        <p className="prose-scene mt-4 max-w-2xl text-foreground/55">
          Every prompt is asked the same {BATTERY.universal} questions, plus a few that only apply to its scene,
          giving {BATTERY.perCellMin} or {BATTERY.perCellMax} in all and {BATTERY.distinct} distinct across the study.
          When one answer comes back for at least {Math.round(SETTLED * STATS.seeds)} of a prompt's {STATS.seeds}{' '}
          images, we treat it as a named assumption: something the model tends to decide that the prompt left open.
          Stable Diffusion 2.1 has <strong className="text-foreground/75">{CARDS_HEADLINE}</strong> of these, or{' '}
          <strong className="text-foreground/75">{CARDS_TOTAL}</strong> if answers reaching{' '}
          {Math.round(SECONDARY * STATS.seeds)} of {STATS.seeds} are also counted.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          {/* two rows of boxes rather than two dropdowns: the whole 6 × 9 grid of
              prompts is visible, and moving along one row is a single click */}
          <div className="flex flex-col gap-2.5">
            <BoxPicker label="scene" value={sit} onChange={setSit} options={SIT_OPTS} size="sm" />
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
              the predefined semantic concept questioned over 50 seeds
            </div>
            <div className="mt-4">
              <BatteryList sit={sit} code={code} />
            </div>
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

          {/* REMOVED 2026-08-10 (Giray): the red "caveat that rides on every count on
              this page" box (BLIND_SPOT) and the evidence TierNote under it.
              The caveat it carried — that the six cross-models publish 24 thumbnails
              of the 50, while every statistic uses all 50 — is stated on scene 02,
              in the note above the grid that appears whenever the reader is not on
              SD 2.1. BLIND_SPOT is still exported from data/part4.ts and unread. */}
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
/* MinorRow and its MINOR = 0.1 threshold collapsed the small shares into a
   one-line summary. Removed 2026-08-10 with the switch to showing every attribute
   as a bar; MinorRow was removed with it if a cell ever grows
   long enough to need folding again. */

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
  /* Every row gets a bar, 2026-08-10 (Giray). A 0.1 threshold used to fold the
     small shares into a one-line summary, which meant the reader saw a filtered
     chart and had to take the filtering on trust. A cell carries 14-16 attributes,
     so there was never a length problem to solve; showing all of them lets the
     shape of the whole decomposition be read, small bars included. The three
     groups stay, including the circular one. */
  const real = rows.filter((r) => !r.sep)
  const taut = rows.filter((r) => r.sep)
  const moved = real.filter((r) => r.plain !== r.value)
  const still = real.filter((r) => r.plain === r.value)
  const maxShare = Math.max(1, ...rows.map((r) => r.share))

  return (
    <SceneShell
      number="08"
      kicker="what carries the distance"
      title={<>Which concepts <em className="font-display italic text-amber-200">carry the distance.</em></>}
    >
      {/* Giray's text, 2026-08-11. Every example below was checked against the
          shift table this chart draws (crossmodel.json → shift.sd21), plain → value
          with its share:
            family   U11  average → poor    ID .775  IN .755  NG .382
            celebr.  U05b mixed   → trad.   JP .597
            wedding  U07  hall    → house   DE .306
                          hall    → church  RU .082
                          hall    → temple  ID .703  JP .794  EG .718
            breakfast B2  table   → table   .002–.153, ranked 10th-15th of 15
          The wording "receives similar answers" is restored from Giray's source here
          after having been corrected once: the breakfast example that closes the
          paragraph is exactly this case and its shares really are the low ones. The
          subtlety it glosses — a concept can keep its top answer and still carry a
          share, because the split underneath moved — is carried by the panel's own
          note above the unchanged-answer group, where the reader meets the bars. */}
      <Reveal>
        <p className="prose-scene max-w-2xl">
          We can now connect the semantic concepts to the geometric alignment observed in the embedding space. For each
          country-specific prompt, we compare the distribution of answers for every concept with those obtained under
          the corresponding geographically unspecified prompt. If a concept receives similar answers in both sets of
          generations, it contributes little to explaining their embedding distance. In contrast, concepts whose
          answers change substantially between the two prompts account for a larger share of the observed difference.
          Example findings from the figure below include the dominant economic-status annotation for “a family”, which
          shifts from average under the geographically unspecified prompt toward poor for Indonesia, India, and
          Nigeria. For “a celebration”, clothing shifts from mixed in the unspecified prompt toward traditional for
          Japan. And for “a wedding”, the dominant building type shifts from a hall in the unspecified prompt toward a
          house in Germany, a church in Russia, and a temple in Indonesia, Japan, and Egypt. By contrast, breakfast is
          usually generated on a table regardless of the geographic context. Therefore, the food placement does not
          contribute much to explaining the embedding distance.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <BoxPicker label="scene" value={sit} onChange={setSit} options={SIT_OPTS} size="sm" />
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
                the explained distance: <strong className="text-foreground">{data.distance.toFixed(3)}</strong>{' '}
                between “a {sit}” and “a {sit} in {C8[code].name}”
              </div>

              <div className="mt-6 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                attributes whose answer changed · {moved.length} of {real.length}
              </div>
              <div className="mt-3 space-y-2.5">
                {moved.map((r, i) => (
                  <ShiftBar key={r.q} r={r} i={i} maxShare={maxShare} cv={C8[code].cv} />
                ))}
              </div>

              <div className="mt-7 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                attributes whose answer did not change · {still.length} of {real.length}
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

              {taut.length > 0 && (
                <>
                  <div className="mt-7 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                    true but circular · {taut.length}
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {taut.map((r, i) => (
                      <ShiftBar key={r.q} r={r} i={i} maxShare={maxShare} cv={C8[code].cv} muted />
                    ))}
                  </div>
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
              text={`Each bar is the share of the unspecified→country movement predicted from one attribute's answer proportions over the pooled 50+50 images, DINOv3 embeddings, ${MODEL_NAME[model]}'s own answers${isSd21(model) ? '' : `, from the cross-model run: ${CROSS_MODEL_NOTE.charAt(0).toLowerCase()}${CROSS_MODEL_NOTE.slice(1)}`}. Shares are per attribute and deliberately do not sum to 1.`}
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

/* The section's heading and opening paragraph, above both scenes. */
function SectionLead() {
  /* mt-8, not mt-20: SectionHeader above already carries the section's top margin */
  return (
    <div className="mx-auto mt-8 w-full max-w-6xl px-6">
      <Reveal>
        <p className="prose-scene max-w-2xl">
          So far, distances in the embedding space have described the geometric alignment between the generated
          images. We next examine semantic concepts in the images, such as clothing, objects, and other scene-specific
          attributes, that are more directly interpretable in relation to what a user may care about <Cite ids={['franchi2025']} />. For each
          prompt, we test which semantic concepts from a predefined set recur consistently across generations. For
          example, when generating “a breakfast in Japan”, the model may frequently assume “rice” among the dishes. We
          can further use these concepts to characterize how the generated images differ semantically across prompts.
        </p>
      </Reveal>
    </div>
  )
}

/* ── Part II ─────────────────────────────────────────────────────────────── */

export default function Part4Assumptions() {
  return (
    <>
      <SectionLead />
      <NamedScene />
      <BridgeScene />
    </>
  )
}
