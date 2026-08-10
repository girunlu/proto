import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, DistanceRuler, KnnNote, BoxPicker, MetricToggle, Setup, useMagnet } from '../components/Viz'
import branchAData from '../data/branchA.json'

/** per-model, per-situation, per-country k-NN separability AUC (review 10 · C-3) */
const branchAKnn = branchAData.knn as Record<string, Record<string, Record<string, number>>>
import { Sd21Only } from '../components/ModelBar'
import { rgb, rgba } from '../lib/colors'
import {
  SITS, COUNTRY8, C8, CV_DEFAULT, decisionsFrom, F3, SOUTH,
  SILHOUETTE_RANGE,
  type Sit, type Code,
} from '../data/part1'
import { HARDENING, key } from '../data/uiv2'
import { CARDS_HEADLINE, CARDS_CANDIDATES } from '../data/part4'
import { useModel, modelImg, modelSeeds, modelVqa, seedCount, isSd21, MODEL_NAME, CROSS_MODEL_NOTE, type ModelId } from '../data/modelData'
/* Tier C: both rulers now exist for all seven models (the CLIP tables were
   already computed, they were simply never exported), so these read straight
   through instead of falling back to DINOv3 for the cross-model six. */
import { dist, distOrNull, RULER_MAX, umapFor, f3For, type Ruler } from '../data/crossmodel'

export type { Ruler }
const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))

/* ── shared bits ─────────────────────────────────────────────────────────── */

/* The legend doubles as the filter: hovering an entry brings that country's points
   forward and fades the rest, which is the only way to follow one country through a
   cloud of 240 dots.

   Clicking was supposed to pin it so the pointer could leave, and it did not work:
   `onMouseLeave` cleared the focus unconditionally, so the pin was undone by the
   very act of moving away to look at the plot. A pinned selection is now held here
   and hover only *previews* on top of it — leaving an entry falls back to whatever
   is pinned rather than to nothing. */
export type Focus = Code | 'default' | null

/* exported only so the dismissed scene 04 (Part1SeedBySeed.tsx) still compiles */
export function Legend({ withDefault = true, focus, onFocus }: {
  withDefault?: boolean
  focus?: Focus
  onFocus?: (c: Focus) => void
}) {
  const [pinned, setPinned] = useState<Focus>(null)
  const entries: { id: Code | 'default'; name: string; cv: string }[] = [
    ...(withDefault ? [{ id: 'default' as const, name: 'default prompt', cv: CV_DEFAULT }] : []),
    ...COUNTRY8.map((c) => ({ id: c.id as Code | 'default', name: c.name, cv: c.cv })),
  ]
  const select = (id: Focus) => {
    const next = pinned === id ? null : id
    setPinned(next)
    onFocus?.(next)
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {entries.map((e) => {
        const dim = onFocus && focus != null && focus !== e.id
        const isPinned = pinned === e.id
        return (
          <button
            key={e.id}
            onMouseEnter={() => onFocus?.(e.id)}
            onMouseLeave={() => onFocus?.(pinned)}
            onClick={() => select(e.id)}
            aria-pressed={isPinned}
            disabled={!onFocus}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 font-mono2 text-[10px] transition ${
              dim ? 'text-foreground/25' : 'text-foreground/50'
            } ${onFocus ? 'cursor-pointer hover:text-foreground/80' : 'cursor-default'} ${
              isPinned ? 'bg-foreground/10 text-foreground/90 ring-1 ring-foreground/25' : ''
            } ${focus === e.id && !isPinned ? 'text-foreground/90' : ''}`}
          >
            <span
              className="h-2 w-2 rounded-full transition"
              style={{ background: rgb(e.cv), opacity: dim ? 0.3 : 1 }}
            />
            {e.name}
          </button>
        )
      })}
      {onFocus && (
        <>
          <span className="font-mono2 text-[9px] text-foreground/30">
            {pinned ? 'pinned · click to release' : 'click to pin'}
          </span>
          {pinned && (
            <button
              onClick={() => select(pinned)}
              className="rounded border border-border px-2 py-0.5 font-mono2 text-[9px] text-foreground/60 transition hover:border-foreground/40 hover:text-foreground/90"
            >
              show all
            </button>
          )}
        </>
      )}
    </div>
  )
}

/* ── Scene 1 · the unsaid (ported from Layer1Unsaid) ─────────────────────── */

/* The dice. The wall normally shows a typicality spread (typical → outlier);
   a roll picks uniformly at random instead — the "never trust one seed" lesson
   made clickable. Deterministic per (model, cell, roll) so re-renders don't
   reshuffle on their own. */
function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function rolledSeeds(m: ModelId, sit: Sit, code: Code | 'default', n: number, roll: number) {
  // the published seed ids are not 0..n-1 for the cross-models, so draw from the
  // cell's own list rather than counting
  const pool = modelSeeds(m, sit, code, seedCount(m, sit, code))
  const rnd = mulberry32(hashStr(`${m}_${sit}_${code}_${roll}`))
  const picks: number[] = []
  while (picks.length < Math.min(n, pool.length)) {
    picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  }
  return picks.sort((a, b) => a - b)
}

function UnsaidScene() {
  const { model } = useModel()
  const [sit, setSit] = useState<Sit>('wedding')
  /* the whole battery for this cell, not the top eight: the scene's claim is about
     how much gets settled, so showing a selection of it undercuts the point. R3:
     follows the model switcher — the cross-model VQA is exported for all seven. */
  const decisions = useMemo(
    () => decisionsFrom(modelVqa(model, sit, 'default')?.closed ?? {}, 0),
    [model, sit]
  )
  const settled = decisions.filter((d) => d.share >= 0.8)
  const SHOWN = 4
  return (
    <SceneShell
      number="01"
      kicker="Part I · the default · the unsaid"
      title={<>A two-word prompt leaves most of the picture <em className="font-display italic text-amber-200">unspecified.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          “A {sit}” fixes a noun and an article; the setting, clothing, period, light and wealth level it says nothing
          about. The model fills each gap in anyway, and the answers barely vary.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 max-w-3xl">
          <Setup
            rows={[
              { k: 'what we ran', v: '“A wedding”, plainly, no country, no era, no detail. 50 images per prompt from fixed seeds (SD 2.1: DDIM, 30 steps, 768×768, guidance 7.5).' },
              { k: 'who answered', v: 'A vision-language annotator (gemma4) sees each image and never the prompt, then answers a frozen battery, 13 questions in every cell, 17–18 per cell.' },
              { k: 'what counts', v: 'A question is settled when one answer covers at least 80% of that cell’s 50 images.' },
            ]}
          detail={<>
              <p>
                <strong>The battery is frozen.</strong> The questions were fixed before the answers were looked at, and
                the annotator never sees the prompt, it is describing a picture, not grading a caption. 13 questions
                are asked in every one of the 54 cells; a further few are situation-specific, giving 17–18 per cell.
              </p>
              <p>
                <strong>Why 80%.</strong> A question counts as settled when one answer covers at least 40 of a cell's
                50 images. The threshold is a convention, not a discovery, it is stated here so you can discount it.
                Questions that clear it in the plain-prompt cell are the ones this scene calls “decisions the model
                made for you”.
              </p>
              <p>
                <strong>What it does not settle.</strong> That an answer is consistent says nothing about whether it is
                <em> right</em>. A model can be wrong the same way 50 times, and the annotator would report a settled
                question either way.
              </p>
          </>}
        />
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="grid gap-6 md:grid-cols-[170px_1fr]">
            {/* the event list, as a list — the previous version buried it in a dropdown
                inside a card whose other job was a pair of large animated numerals */}
            <div>
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">the prompt</div>
              {/* A native <select>: a dropdown was asked for, and the platform already
                  has one that is keyboard- and screen-reader-correct for free.
                  ── TO REVERT to the stacked list, swap this <select> block for: ──
                  <div className="mt-2 space-y-1">
                    {SITS.map((s2) => (
                      <button
                        key={s2}
                        onClick={() => setSit(s2)}
                        aria-pressed={s2 === sit}
                        className={`block w-full rounded-md border px-2.5 py-1.5 text-left font-mono2 text-[12px] transition ${
                          s2 === sit
                            ? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
                            : 'border-border text-foreground/55 hover:border-foreground/40 hover:text-foreground/85'
                        }`}
                      >
                        “a {s2}”
                      </button>
                    ))}
                  </div>
                  ── end of the stacked-list version ── */}
              <select
                value={sit}
                onChange={(e) => setSit(e.target.value as Sit)}
                aria-label="event"
                className="mt-2 w-full cursor-pointer rounded-md border border-amber-300/50 bg-amber-300/10 px-2.5 py-1.5 font-mono2 text-[12px] text-amber-200 transition hover:border-amber-300/80 focus:outline-none focus:ring-1 focus:ring-amber-300/60"
              >
                {SITS.map((s2) => (
                  <option key={s2} value={s2} className="bg-background text-foreground">
                    a {s2}
                  </option>
                ))}
              </select>
              <div className="mt-5 border-t border-border pt-4 font-mono2 text-[10px] leading-5 text-foreground/45">
                {decisions.length} questions asked<br />
                {seedCount(model)} published of 50 images<br />
                <span className="text-amber-200/80">{settled.length} settled at ≥80%</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 font-mono2 text-[9px] tracking-wider text-foreground/40 uppercase">
                <span>what the prompt left open</span>
                <span>the answer it got anyway · of 50</span>
              </div>
              <div className="mt-1">
                {decisions.slice(0, SHOWN).map((d) => {
                  const firm = d.share >= 0.8
                  return (
                    <div
                      key={d.attr}
                      className="flex items-center gap-3 border-b border-border/40 py-1.5 last:border-0"
                      title={d.stat}
                    >
                      <span className="w-44 shrink-0 truncate font-mono2 text-[10px] text-foreground/50">{d.attr}</span>
                      <span className={`w-28 shrink-0 truncate font-mono2 text-[11px] ${firm ? 'text-amber-200' : 'text-foreground/60'}`}>
                        {d.answer}
                      </span>
                      <div className="relative h-1.5 min-w-0 flex-1 rounded-full bg-foreground/10">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ background: firm ? rgb('--c-amber') : rgba('--c-gray', 0.55) }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${d.share * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5 }}
                        />
                        {/* the 80% bar the "settled" count is defined against */}
                        <span className="absolute inset-y-[-2px] w-px bg-foreground/30" style={{ left: '80%' }} />
                      </div>
                      <span className={`w-9 shrink-0 text-right font-mono2 text-[10px] ${firm ? 'text-foreground/75' : 'text-foreground/40'}`}>
                        {Math.round(d.share * 100)}%
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 text-sm leading-6 text-foreground/60">
                A row is a hidden assumption when the prompt did not ask for it and the answer returns on at least 80%
                of the seeds: the tick on each bar. Each is unremarkable alone; together they are one consistent
                picture of the world that nobody requested.
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text={`50 seeds per prompt, each image read blind by one annotator (gemma4) against a frozen question list: ${CARDS_CANDIDATES} candidate assumptions project-wide, ${CARDS_HEADLINE} headline-tier. ${CROSS_MODEL_NOTE}`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 2 · the default has a nationality (F1) ────────────────────────── */

/* Every cell visible at once as an image mosaic with a distance bar on one
   shared scale. Hovering a cell fills the inspector beside the wall, and the
   ZoomImage corner panel enlarges the individual seed under the cursor. */

/* ── the board ────────────────────────────────────────────────────────────── */

/* The mosaic wall and the heatmap were two panels showing one quantity: each cell's
   distance from its own row's default prompt. One as pictures with a bar, one as a
   shaded number. They are now a single grid with a switch, because a reader
   comparing them was comparing a thing to itself — and Part I renders this same
   statistic more times than it earns. */
export type GridMode = 'thumbs' | 'numbers'

function CellGrid({ mode, onSelect, ruler, roll, controls }: {
  mode: GridMode
  onSelect: (s: Sit) => void
  ruler: Ruler
  roll: number
  /* the ruler switch and the dice: they sit under the inspector rather than in the
     panel header, where they crowded the title and hung over the wall's edge */
  controls: ReactNode
}) {
  const { model } = useModel()
  type Cell = { sit: Sit; code: Code | 'default' }
  /* `hover` drives the highlight and is null whenever the pointer is off the grid,
     so nothing stays lit after the mouse leaves. `last` remembers where it was, so
     the inspector stays populated instead of emptying every time you look away. */
  const [hover, setHover] = useState<Cell | null>(null)
  const [last, setLast] = useState<Cell>({ sit: 'wedding', code: 'NG' })
  const enter = (c: Cell) => { setHover(c); setLast(c) }
  /* Pick any two cells and hold them side by side. The cross-shaped hover highlight
     advertises this: it lights the cells sharing the hovered row and column, which is
     the comparison a reader assumes is the only one on offer — and then the selection
     lets them take any two cells, across events as easily as within one.
     Thumbnails only: on the shaded grid the same treatment fights the encoding, since
     dimming the off-cross cells is dimming the very colour that carries the number. */
  const cross = mode === 'thumbs'
  const [sel, setSel] = useState<{ sit: Sit; code: Code | 'default' }[]>([])
  const same = (a: { sit: Sit; code: Code | 'default' }, b: { sit: Sit; code: Code | 'default' }) =>
    a.sit === b.sit && a.code === b.code
  const selIndex = (sit: Sit, code: Code | 'default') => sel.findIndex((c) => same(c, { sit, code }))
  const toggle = (sit: Sit, code: Code | 'default') => {
    const cell = { sit, code }
    setSel((cur) => {
      const i = cur.findIndex((c) => same(c, cell))
      if (i >= 0) return cur.filter((_, j) => j !== i)
      return cur.length < 2 ? [...cur, cell] : [cur[1], cell]   // third pick pushes the oldest out
    })
  }
  const pick = (sit: Sit, code: Code | 'default', n: number) =>
    roll === 0 ? modelSeeds(model, sit, code, n) : rolledSeeds(model, sit, code, n, roll)
  const cellInfo = (c: { sit: Sit; code: Code | 'default' }) => ({
    ...c,
    seeds: pick(c.sit, c.code, 4),
    cv: c.code === 'default' ? CV_DEFAULT : C8[c.code].cv,
    d: distOrNull(model, c.sit, c.code, ruler),
    label: `a ${c.sit}${c.code === 'default' ? '' : ` in ${C8[c.code].name}`}`,
  })
  /* with nothing picked the inspector keeps following the pointer, as before */
  const shown = (sel.length ? sel : [hover ?? last]).map(cellInfo)

  /* One scale for the whole grid: the palest cell is the smallest distance anywhere
     in the 48, the most solid is the largest. Colour is then comparable across rows,
     at the cost the earlier per-row scaling was avoiding — an event with a narrow
     spread reads as uniformly pale next to one with a wide spread. Numbers are
     absolute either way and the endpoints are drawn under the grid. */
  const range = useMemo(() => {
    const vals = SITS.flatMap((s) =>
      COUNTRY8.map((c) => distOrNull(model, s, c.id, ruler)?.mean).filter((v): v is number => v != null)
    )
    return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 1 }
  }, [model, ruler])

  const CODES = ['default', ...COUNTRY8.map((c) => c.id)] as (Code | 'default')[]

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div>
        {/* the highlight used to survive the pointer leaving, because `hover` was
            seeded with a cell and never cleared */}
        <div className="space-y-1.5" onMouseLeave={() => setHover(null)}>
          <div className="grid grid-cols-[80px_repeat(9,1fr)] gap-1.5">
            <div />
            {CODES.map((code) => (
              <div
                key={code}
                className={`text-center font-mono2 text-[10px] transition ${cross && hover?.code === code ? 'font-bold' : ''}`}
                style={{
                  color: code === 'default' ? rgb(CV_DEFAULT) : rgb(C8[code].cv),
                  opacity: !cross || !hover ? 1 : hover.code === code ? 1 : 0.45,
                }}
              >
                {code === 'default' ? 'default' : code}
              </div>
            ))}
          </div>
          {SITS.map((sit) => (
            <div key={sit} className="grid grid-cols-[80px_repeat(9,1fr)] gap-1.5">
              <button
                onClick={() => onSelect(sit)}
                className={`pr-2 text-left font-mono2 text-[11px] transition hover:text-amber-200 ${
                  cross && hover?.sit === sit
                    ? 'text-amber-200'
                    : cross && hover
                      ? 'text-foreground/35'
                      : 'text-foreground/60'
                }`}
              >
                {sit}
              </button>
              {CODES.map((code) => {
                const d = distOrNull(model, sit, code, ruler)
                const v = d?.mean ?? 0
                const active = hover?.sit === sit && hover?.code === code
                const crossed = cross && !active && !!hover && (hover.sit === sit || hover.code === code)
                const si = selIndex(sit, code)
                const dimmed = sel.length > 0 && si < 0
                const span = range.max - range.min
                const rel = d ? (span ? (v - range.min) / span : 1) : 0
                const edge =
                  si >= 0
                    ? 'border-amber-300 ring-2 ring-amber-300/60'
                    : active
                      ? 'border-amber-300 ring-2 ring-amber-300/40'
                      : crossed
                        ? 'border-amber-300/60 ring-1 ring-amber-300/25'
                        : 'border-border group-hover:border-foreground/40'
                return (
                  <button
                    key={code}
                    onClick={() => toggle(sit, code)}
                    onMouseEnter={() => enter({ sit, code })}
                    aria-pressed={si >= 0}
                    title={
                      d
                        ? `${sit} × ${code}: ${d.mean.toFixed(3)} [${d.ci_low.toFixed(3)}, ${d.ci_high.toFixed(3)}]`
                        : 'the default prompt, the reference point'
                    }
                    className={`group relative text-left transition ${
                      active || si >= 0 ? 'z-20 ' : ''
                    }${
                      dimmed
                        ? 'opacity-30 hover:opacity-70'
                        : cross && hover && !(crossed || active || si >= 0)
                          ? 'opacity-45 hover:opacity-90'
                          : 'opacity-100'
                    }`}
                  >
                    {si >= 0 && (
                      <span className="absolute -top-1.5 -left-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-300 font-mono2 text-[9px] text-black">
                        {si + 1}
                      </span>
                    )}
                    {mode === 'thumbs' ? (
                      <>
                        <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-md border transition ${edge}`}>
                          {pick(sit, code, 4).map((seed) => (
                            <img
                              key={seed}
                              src={modelImg(model, sit, code, seed)}
                              alt={`${sit} ${code} seed ${seed}`}
                              loading="lazy"
                              className="aspect-square w-full object-cover"
                            />
                          ))}
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-foreground/10">
                          <motion.div
                            className="h-1.5 rounded-full"
                            style={{ background: rgb('--c-amber') }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${code === 'default' ? 2 : (v / RULER_MAX[ruler].dist) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      </>
                    ) : (
                      <div
                        className={`flex aspect-square items-center justify-center rounded-md border font-mono2 transition ${edge} ${
                          active || si >= 0
                            ? 'scale-[1.2] text-[13px] font-bold ring-2 ring-amber-300/80 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]'
                            : 'text-[11px]'
                        }`}
                        style={{
                          /* one hue, one grade: colour used to carry country identity,
                             which the column header already carries — shade alone now
                             carries the number */
                          background: code === 'default' ? rgba(CV_DEFAULT, 0.12) : rgba('--c-amber', 0.10 + 0.78 * rel),
                          color: rel > 0.62 ? '#0b0b10' : 'hsl(var(--foreground) / 0.75)',
                        }}
                      >
                        {d ? d.mean.toFixed(2) : '·'}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {mode === 'thumbs' ? (
            <div className="mt-3 flex items-start gap-3 rounded-md border border-border bg-background/40 p-3">
              <div className="mt-1 w-24 shrink-0">
                <div className="h-1.5 rounded-full bg-foreground/10">
                  <div className="h-1.5 w-2/3 rounded-full bg-amber-300" />
                </div>
              </div>
              <p className="font-mono2 text-[10px] leading-4 text-foreground/50">
                the bar under each cell is one measurement: how far that variant's 50 images sit from the
                default prompt in its own row.
              </p>
            </div>
          ) : (
            /* the scale, directly under the thing it scales — five ticks across the
               real range so a shade can be read back to a number, not just ordered */
            <div className="mx-auto mt-4 max-w-[520px]">
              <div
                className="h-3 w-full rounded-sm"
                style={{ background: `linear-gradient(to right, ${rgba('--c-amber', 0.10)}, ${rgba('--c-amber', 0.88)})` }}
              />
              <div className="mt-1 flex justify-between font-mono2 text-[9px] text-foreground/50">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <span key={f}>{(range.min + f * (range.max - range.min)).toFixed(2)}</span>
                ))}
              </div>
              <div className="mt-1 text-center font-mono2 text-[9px] text-foreground/35">
                distance from that row's default prompt · one scale for all 48 cells · hover a cell for its interval
              </div>
            </div>
          )}
        </div>
      </div>

      {/* the inspector: always populated, never covers the wall */}
      <div>
        <div className="sticky top-24 space-y-3">
          <div className="hidden rounded-xl border border-border bg-background/70 p-3 lg:block">
            {shown.map((c, i) => (
              <div key={`${c.sit}_${c.code}`} className={i ? 'mt-3 border-t border-border pt-3' : ''}>
                <div className="flex items-baseline gap-2">
                  {sel.length > 0 && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-300 font-mono2 text-[9px] text-black">
                      {i + 1}
                    </span>
                  )}
                  <div className="font-mono2 text-[11px] leading-4" style={{ color: rgb(c.cv) }}>
                    “{c.label}”
                  </div>
                </div>
                <div className="mt-1 font-mono2 text-[10px] text-foreground/45">
                  {c.d
                    ? `${c.d.mean.toFixed(3)} from the default prompt · very likely ${c.d.ci_low.toFixed(2)}–${c.d.ci_high.toFixed(2)}`
                    : 'the default prompt, the reference point'}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {/* plain <img>, deliberately: this grid IS already the preview for the
                      matrix, so ZoomImage popped a second thumbnail on top of it. */}
                  {c.seeds.map((seed) => (
                    <img
                      key={seed}
                      src={modelImg(model, c.sit, c.code, seed)}
                      alt={`${c.sit} ${c.code} seed ${seed}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-md border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            ))}
            {sel.length === 2 && shown[0].d && shown[1].d && (
              <div className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/5 p-2 font-mono2 text-[10px] leading-4 text-foreground/65">
                {shown[0].d.mean.toFixed(3)} against {shown[1].d.mean.toFixed(3)}, each measured from its own
                event's default prompt
                {shown[0].sit !== shown[1].sit && ', and those are two different default prompts, so read the pair as two separate departures rather than a distance between these two cells'}
                .
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 font-mono2 text-[9px] leading-4 text-foreground/35">
              <span>
                {sel.length === 0
                  ? 'click any two cells to compare them'
                  : sel.length === 1
                    ? 'pick a second cell (any row, any column)'
                    : 'a third pick replaces the first'}
              </span>
              {sel.length > 0 && (
                <button
                  onClick={() => setSel([])}
                  className="ml-auto shrink-0 rounded border border-border px-2 py-0.5 text-foreground/60 transition hover:border-foreground/40 hover:text-foreground/90"
                >
                  clear
                </button>
              )}
            </div>
          </div>
          {controls}
        </div>
      </div>
    </div>
  )
}

/* DistanceBars was REMOVED 2026-08-06: it re-drew the same distances the heatmap
   above already prints, one event at a time. The heatmap's hover line carries the
   confidence interval it used to be the only home for, and the evidence block that
   sat under it — the sorting test, the below-chance disclosure and the permutation
   note — moved into the heatmap panel rather than going with it. */
function NationalityScene() {
  const { model } = useModel()
  const [situation, setSituation] = useState<Sit>('wedding')
  const [ruler, setRuler] = useState<Ruler>('dinov3')
  const [roll, setRoll] = useState(0)
  /* one board, two encodings of the same measurement */
  const [gridMode, setGridMode] = useState<GridMode>('thumbs')
  const onSd21 = isSd21(model)
  const weddingUS = dist(model, 'wedding', 'US', ruler).mean
  const weddingNG = dist(model, 'wedding', 'NG', ruler).mean
  /* Review 10 · C-3: this printed SD 2.1's AUC range under every model. Per-cell
     cross-model AUCs run 0.46-1.00 — Flux's floor is below chance — so a sentence
     claiming "97% of the time" was false for four of the seven. Now reads the
     selected model's own row. */
  const aucs = (
    isSd21(model)
      ? COUNTRY8.map((c) => HARDENING[key(situation, c.id)]?.knn_auc)
      : COUNTRY8.map((c) => (branchAKnn[model]?.[situation] as Record<string, number> | undefined)?.[c.id])
  ).filter((v): v is number => v != null)
  return (
    <SceneShell
      number="02"
      kicker="Part I · the default · finding 1"
      title={<>The default has a <em className="font-display italic text-amber-200">nationality.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          We generate <strong>“a wedding”</strong> and <strong>“a wedding in Nigeria”</strong> 50 times each, and
          measure how far apart the two sets of pictures sit: <strong>the default prompt and “in the USA” generate
          almost the same pictures</strong> ({weddingUS.toFixed(2)} apart), while Nigeria sits{' '}
          {weddingNG.toFixed(2)} away.
        </p>
        {/* R6: the page used "Western default" throughout without ever saying what
            it was operationally. One sentence, at the first place the claim is made. */}
        <p className="prose-scene mt-4 max-w-2xl text-foreground/55">
          One definition, used everywhere below. <strong className="text-foreground/75">“Western default”</strong> means
          the pictures a default prompt generates sit closer to the US and Germany variants than to the India, Nigeria,
          Indonesia and Egypt ones, in an embedding space trained without any of these labels. It is a claim about
          relative position in that space, not about culture, and not about what any of these countries looks like.
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mt-6 max-w-3xl">
          <Setup
            rows={[
              { k: 'what we ran', v: 'Six events, each written nine ways: plainly, and once naming each of eight countries. The same 50 fixed seeds in every variant, so nothing differs but the words.' },
              { k: 'what we measured', v: 'Cosine distance between the default set and each country set in DINOv3-7B space, with CLIP available as a second ruler on the toggle.' },
              { k: 'how we know', v: 'Intervals come from resampling those 50 seeds (bootstrap). Separability is a nearest-neighbour classifier’s accuracy (k-NN AUC), read against a 10,000-shuffle null.' },
              { k: 'the mosaics', v: 'Grids show the four least-alike images in a cell, picked by embedding distance, a grid curated for variety cannot be accused of hiding the collapse.' },
            ]}
          detail={<>
              <p>
                <strong>The distance.</strong> Each cell is 50 images → 50 DINOv3-7B CLS vectors → one mean vector.
                The number plotted is the cosine distance between two such means. The confidence interval comes from
                resampling the 50 seeds with replacement, so it reflects seed variation, not annotator noise.
              </p>
              <p>
                <strong>Why the ruler strip is on every chart.</strong> A bare cosine is meaningless to a reader, so
                every distance chart carries two anchors from this same data: ≈0.06 is “a wedding” against “a wedding in
                the USA”, ≈0.8 is “a wedding” against “a breakfast”. Read every bar against those.
              </p>
              <p>
                <strong>Separability.</strong> k-NN AUC is how reliably a nearest-neighbour classifier tells the two
                50-image sets apart in the full embedding space, scored against a 10,000-shuffle permutation null. It
                is reported alongside the distance because the two can disagree: sets whose centroids sit close can
                still be almost perfectly separable.
              </p>
          </>}
        />
        </div>
      </Reveal>
      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              the whole board · 54 cells ·{' '}
              {gridMode === 'thumbs'
                ? `4 of ${seedCount(model)} seeds each, ${roll === 0 ? 'typical → outlier' : 'random seeds'}`
                : "distance from each row's default prompt"}
            </div>
            {/* the same measurement, drawn two ways — pictures with a bar, or the
                number with its shading. Two panels used to show this side by side. */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              {([['thumbs', 'thumbnails'], ['numbers', 'distances']] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setGridMode(m)}
                  aria-pressed={gridMode === m}
                  className={`rounded-md px-2.5 py-1 font-mono2 text-[11px] transition ${
                    gridMode === m ? 'bg-amber-300/15 text-amber-200' : 'text-foreground/50 hover:text-foreground/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {!onSd21 && gridMode === 'thumbs' && (
            <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/50">
              Showing <span className="text-amber-200">{MODEL_NAME[model]}</span>: its own images, every distance
              measured from <em>its own</em> default prompt. All 50 seeds go into the statistics; the{' '}
              {seedCount(model)} published thumbnails span the 20 least alike plus the 4 most typical.
            </p>
          )}
          <div className="mt-6">
            <CellGrid
              mode={gridMode}
              onSelect={setSituation}
              ruler={ruler}
              roll={roll}
              controls={
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/70 p-3">
                  <MetricToggle value={ruler} onChange={setRuler} showLabel={false} />
                  {gridMode === 'thumbs' && (
                    <>
                      <button onClick={() => setRoll((r) => r + 1)} className="chip !px-2.5 !py-1">
                        ⚄ roll other seeds
                      </button>
                      {roll > 0 && (
                        <button onClick={() => setRoll(0)} className="chip !px-2.5 !py-1">
                          typical → outlier
                        </button>
                      )}
                    </>
                  )}
                </div>
              }
            />
          </div>
          {/* the colour key, which used to sit in the heatmap panel's header — both
              encodings colour by country, so it belongs to the merged board */}
          <div className="mt-5 border-t border-border pt-4">
            <Legend withDefault={false} />
          </div>
          <div className="mt-6">
            <DistanceRuler />
          </div>
          {/* The evidence block used to live under the per-event bar chart. That chart
              was removed as a duplicate of this grid, but review 01 · R5.7 declined the
              same removal once already, because these four disclosures existed nowhere
              else: the sorting test, its below-chance floor on some models, the
              permutation result, and the second-ruler replication. They move here
              rather than go. The event picker stays because the prose is per-event. */}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              how the gap for one event was tested
            </div>
            <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {onSd21 ? <KnnNote /> : (
              <p className="text-sm leading-6 text-foreground/60">
                The per-cell sorting test is measured on Stable Diffusion 2.1 only. {MODEL_NAME[model]}'s own gaps
                are permutation-tested too (286 of 288 model × cell combinations clear p &lt; 0.05), so what is
                missing on this chart is the per-cell figure, not the testing.
              </p>
            )}
            <div className="space-y-3">
              {(situation === 'school' || situation === 'celebration') && (
                <p className="text-sm leading-6 text-foreground/60">
                  {`“A ${situation}” looks diffuse on this grid, not the same as absent${
                    aucs.length && Math.min(...aucs) < 0.5
                      ? ', but on its weakest cell the sorting test scores below the 50% a coin would, so read no separation into it'
                      : ''
                  }.`}
                </p>
              )}
              <TierNote
                tier="evidence"
                text={`For “a ${situation}” on ${MODEL_NAME[model]} the classifier scores ${Math.round(Math.min(...aucs) * 100)}–${Math.round(Math.max(...aucs) * 100)}% across the eight countries${
                  Math.min(...aucs) < 0.5
                    ? ': the floor is below the 50% a coin would score, so at least one country is not separable from the default at all'
                    : ''
                }; every gap also clears p < 0.0001 in a 10,000-shuffle permutation test, and the ordering survives under a CLIP ruler.`}
              />
            </div>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 3 · the zero point (F2) ───────────────────────────────────────── */

/* Every one of the 54 cells placed on two axes at once: how far it sits from the
   empty prompt, and how far it sits from its own situation's default prompt. If the
   empty prompt were culturally neutral the cloud would be a vertical smear. It is
   a diagonal: whatever the default prompt is close to, the empty prompt is close to
   as well, and both are close to the West. */
/* One row per prompt: distance from the empty prompt, distance from that event's
   own default prompt. SD 2.1 has all 54 cells (its export includes the default prompts
   themselves); the three cross-models that were run with prompt="" have the 48
   country cells. */
export interface EmptyPoint { sit: Sit; code: Code | 'default'; d_empty: number; d_default: number }

/* Every default seed as a gray dot in the same projection scene 03's map uses.
   The rings are the eight country centroids; hover magnet-snaps to the nearest
   dot, shows its image, and draws a line to the centroid its embedding sits
   nearest, in that country's colour — the tally's assignment, drawn. The labels
   are computed in the full embedding space, not in this projection, so a line can
   visibly cross into another cloud: the projection is a view, the labels are the
   measurement. Wheel-zoom and drag-pan are the same machinery as the map: UMAP
   packs the near-default countries on top of each other, so at 1× neither the
   magnet nor the eye can separate them. */
/* ── Scene 5 · the map is real (F4 + F5) ─────────────────────────────────── */

/* The nearest-cluster tally used to sit in scene 04, beside the thumbnail strip.
   Moved here 2026-08-10 (Giray): it is the same per-seed assignment this map
   already draws, counted — so the count and the picture of it belong together.
   Scene 04 keeps the strip and the scatter, which is where "seed by seed" is
   actually shown. Labelled "default seeds" here because, unlike scene 04, the
   surrounding plot holds all nine variants and "all N seeds" would be read as
   the whole cloud. */
function ClusterTally({ situation }: { situation: Sit }) {
  const { model } = useModel()
  const labels = (isSd21(model) ? F3[situation] : f3For(model, situation) ?? F3[situation]) as Code[]
  const counts = useMemo(() => {
    const m = new Map<Code, number>()
    labels.forEach((l) => m.set(l, (m.get(l) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [labels])
  const southHere = labels.filter((l) => SOUTH.includes(l)).length
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
        the {labels.length} default seeds, by nearest cluster · {situation}
      </div>
      <div className="mt-3 space-y-1.5">
        {counts.map(([code, n]) => (
          <div key={code} className="flex items-center gap-2">
            <span className="w-6 font-mono2 text-[10px]" style={{ color: rgb(C8[code].cv) }}>{code}</span>
            <div className="relative h-3 flex-1 rounded-sm bg-foreground/5">
              <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${(n / labels.length) * 100}%`, background: rgb('--c-amber') }} />
            </div>
            <span className="w-8 text-right font-mono2 text-[10px] text-foreground/50">{n}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/40">
        {southHere} of these {labels.length} seeds land nearest a Global-South country (IN/NG/ID/EG)
      </p>
    </div>
  )
}

function UmapScatter({ situation, focus, ruler, compact = false }: {
  situation: Sit
  focus?: Focus
  ruler: Ruler
  /* compact = just the plot, for the six-up board; no inspector, no side panel */
  compact?: boolean
}) {
  const { model } = useModel()
  const [hover, setHover] = useState<{ code: Code | 'default'; seed: number } | null>(null)
  /* Tier C: every model has its own fit now, one per (model, situation), all nine
     variants projected together so the clouds stay comparable inside a plot.
     Coordinates arrive already normalised to 0..1 by the exporter. */
  const data = umapFor(model, situation, ruler)
  /* B11: the separability number the finding-5 box reports, over this situation's
     eight country cells. SD 2.1's own hardening table — hence the Sd21Only there. */
  const knnRange = useMemo(() => {
    const aucs = COUNTRY8.map((c) => HARDENING[key(situation, c.id)]?.knn_auc).filter((v): v is number => v != null)
    /* Unreachable while uiv2.ts's import-time validation passes: a partial
       hardening export throws there at boot instead of this box inventing a
       range. Throwing here too keeps that contract if the validation is ever
       removed. */
    if (!aucs.length) throw new Error(`no hardening rows for ${situation}`)
    return [Math.min(...aucs), Math.max(...aucs)]
  }, [situation])
  const W = 640
  const H = 420
  const pad = 26
  const X = (x: number) => pad + x * (W - 2 * pad)
  const Y = (y: number) => H - pad - y * (H - 2 * pad)

  /* UMAP packs the near-default countries on top of each other, so at 1× a dozen
     seeds can occupy the same few pixels and neither the magnet nor the eye can
     separate them. Wheel to zoom about the cursor, drag to pan. Dot radius and
     stroke are divided by k so points stay the same size on screen while the
     cloud spreads — zooming reveals structure rather than growing blobs. */
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 })
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const { k, tx, ty } = view
  const K_MIN = 1
  const K_MAX = 12
  /* Keep the scaled content covering the viewport: it spans [t, t + k·L], so t must
     sit in [L(1-k), 0]. At k = 1 that interval collapses to {0}, which is why
     wheeling all the way back now restores the full graph rather than leaving it
     panned off-centre — and at any zoom it stops the cloud being dragged into
     empty space. */
  const clampView = (k: number, tx: number, ty: number) => ({
    k,
    tx: Math.min(0, Math.max(W * (1 - k), tx)),
    ty: Math.min(0, Math.max(H * (1 - k), ty)),
  })

  const svgXY = (e: React.MouseEvent<SVGSVGElement> | React.WheelEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / box.width) * W,
      y: ((e.clientY - box.top) / box.height) * H,
    }
  }

  /* React registers wheel on the root as a *passive* listener, so calling
     preventDefault() from an onWheel prop does nothing and the page scrolls away
     under the cursor. Bind it to the node ourselves with { passive: false }. */
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const el = svgRef.current
    if (!el || compact) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = el.getBoundingClientRect()
      const x = ((e.clientX - box.left) / box.width) * W
      const y = ((e.clientY - box.top) / box.height) * H
      setView((v) => {
        const next = Math.min(K_MAX, Math.max(K_MIN, v.k * (e.deltaY < 0 ? 1.18 : 1 / 1.18)))
        if (next === v.k) return v
        /* keep the point under the cursor fixed, then clamp */
        return clampView(next, x - ((x - v.tx) / v.k) * next, y - ((y - v.ty) / v.k) * next)
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [compact])

  const zoomed = k > 1.01

  const magnet = useMagnet(
    (data?.points ?? []).map((p) => ({ x: tx + k * X(p.xy[0]), y: ty + k * Y(p.xy[1]), item: p })),
    (p) => p && setHover({ code: p.c as Code | 'default', seed: p.s })
  )

  if (!data) return null

  const plot = (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full ${drag ? 'cursor-grabbing' : zoomed ? 'cursor-grab' : 'cursor-crosshair'}`}
        ref={svgRef}
        {...(compact
          ? {}
          : {
              onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => setDrag(svgXY(e)),
              onMouseUp: () => setDrag(null),
              onMouseLeave: () => setDrag(null),
              onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => {
                if (!drag) return magnet.onMouseMove(e)
                const { x, y } = svgXY(e)
                setView((v) => clampView(v.k, v.tx + (x - drag.x), v.ty + (y - drag.y)))
                setDrag({ x, y })
              },
            })}
      >
        <g transform={`translate(${tx},${ty}) scale(${k})`}>
        {data.points.map((p, i) => {
          const code = p.c as Code | 'default'
          const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
          const on = hover?.seed === p.s && hover?.code === code
          const dim = focus != null && focus !== code
          return (
            <circle
              key={i}
              cx={X(p.xy[0])}
              cy={Y(p.xy[1])}
              r={(on ? 7 : compact ? 3 : 4) / k}
              fill={rgb(cv)}
              fillOpacity={dim ? 0.1 : code === 'default' ? 0.9 : 0.65}
              stroke={on ? 'white' : 'none'}
              strokeWidth={1 / k}
              pointerEvents="none"
            />
          )
        })}
        {Object.entries(data.centroids).map(([name, c]) => {
          const code = name as Code | 'default'
          const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
          const dim = focus != null && focus !== code
          return (
            <g key={name} opacity={dim ? 0.15 : 1}>
              <circle cx={X(c[0])} cy={Y(c[1])} r={(compact ? 6 : 8) / k} fill="none" stroke={rgb(cv)} strokeWidth={2 / k} />
              {!compact && (
                <text x={X(c[0])} y={Y(c[1]) - 12 / k} textAnchor="middle" fontSize={9 / k} fill={rgb(cv)} fontFamily="JetBrains Mono">
                  {name === 'default' ? 'default' : code}
                </text>
              )}
            </g>
          )
        })}
        </g>
      </svg>
  )

  if (compact) return plot

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <div>
        {plot}
        <div className="mt-1 flex items-center gap-3 font-mono2 text-[9px] text-foreground/40">
          <span>scroll to zoom · drag to pan</span>
          {zoomed && (
            <button
              onClick={() => setView({ k: 1, tx: 0, ty: 0 })}
              className="ml-auto rounded border border-border px-2 py-0.5 text-foreground/60 transition hover:border-foreground/40 hover:text-foreground/90"
            >
              {k.toFixed(1)}× · reset
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex min-h-[120px] items-center gap-4 rounded-lg border border-border p-3">
          {hover ? (
            <>
              <ZoomImage
                src={modelImg(model, situation, hover.code, hover.seed)}
                alt={`${situation} ${hover.code} seed ${hover.seed}`}
                caption={`“a ${situation}${hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}” · ${MODEL_NAME[model]} · seed ${hover.seed}`}
                imgClassName="h-24 w-24 cursor-zoom-in rounded-lg border border-border object-cover"
              />
              <div className="font-mono2 text-[11px] leading-5 text-foreground/55">
                <span style={{ color: rgb(hover.code === 'default' ? CV_DEFAULT : C8[hover.code].cv) }}>
                  {hover.code === 'default' ? 'default' : C8[hover.code].name}
                </span>
                {' · '}seed {hover.seed}
                <br />a {situation}
              </div>
            </>
          ) : (
            <p className="p-2 font-mono2 text-[11px] text-foreground/35">hover a point to see its image</p>
          )}
        </div>
        {/* R5.6 / B11: this box used to read "silhouette 0.10–0.27, so the clustering
            is statistically real". A silhouette of 0.10 is barely above noise and does
            not support that sentence. The separability evidence is real and already in
            the project — k-NN AUC — so the box now leads with that and reports the
            silhouette as the weak number it is. */}
        <div className="rounded-lg border border-sky-300/25 bg-sky-300/5 p-4">
          <div className="font-mono2 text-[10px] tracking-widest text-sky-300/80 uppercase">
            finding 5 · the countries are separable
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground/70">
            Ask a nearest-neighbour test to tell a country image from a default-prompt one and it ranks them correctly{' '}
            <strong className="text-foreground">{Math.round(knnRange[0] * 100)}–{Math.round(knnRange[1] * 100)}%</strong>{' '}
            of the time across this situation's cells.
          </p>
          <p className="mt-2 text-[13px] leading-5 text-foreground/50">
            The clusters are looser than they look: silhouette scores run{' '}
            {SILHOUETTE_RANGE[0].toFixed(2)}–{SILHOUETTE_RANGE[1].toFixed(2)}, barely above noise at the low end. The
            projection is a view, not the evidence.
          </p>
          <Sd21Only />
        </div>
        <ClusterTally situation={situation} />
      </div>
    </div>
  )
}

function MapScene() {
  const [situation, setSituation] = useState<Sit>('wedding')
  const [focus, setFocus] = useState<Focus>(null)
  const [board, setBoard] = useState(false)
  /* the projection is refitted on whichever embedding space is selected — the same
     question the distance charts answer with their own toggle, asked of the map */
  const [ruler, setRuler] = useState<Ruler>('dinov3')
  return (
    <SceneShell
      number="03"
      kicker="Part I · the default · finding 4"
      title={<>The map is <em className="font-display italic text-amber-200">real.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Flatten the embedding space to two dimensions and the structure is visible to the naked eye. Non-Western
          countries are pulled toward <strong>shared attractors</strong> (Nigeria's nearest cluster is India in 4–5
          of 6 situations), not toward their own faithful depictions.
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mt-6 max-w-3xl">
          <Setup
            rows={[
              { k: 'what we drew', v: 'One UMAP fit per model and event, over all nine variants’ embeddings at once, with coordinates normalised to [0,1]. The rings are each country’s centroid in the projection.' },
              { k: 'how we know', v: 'The separability figure is nearest-neighbour accuracy computed in the full embedding space, not on this two-dimensional picture.' },
              { k: 'the limit', v: 'Silhouette scores run only 0.10–0.27, barely above noise at the low end. The map is a view of the evidence, not the evidence.' },
            ]}
          detail={<>
              <p>
                <strong>One fit per model and event.</strong> All nine variants' embeddings are projected together so
                the clouds inside a single plot are comparable; coordinates are normalised to [0,1] by the exporter.
                Fits are <em>not</em> comparable between plots, UMAP axes carry no units and no meaning.
              </p>
              <p>
                <strong>Why the map is not the evidence.</strong> Silhouette scores over these clusters run 0.10–0.27,
                which at the low end is barely above noise. The claim that the countries separate rests on k-NN AUC in
                the full space, where it is 0.96–0.99 even for the events whose centroid distances look weak. UMAP is
                a picture of a structure measured elsewhere.
              </p>
          </>}
        />
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
UMAP of real {ruler === 'dinov3' ? 'DINOv3' : 'CLIP'} embeddings · {board ? 'all six events' : situation} · rings = true centroids
            </div>
            <div className="flex flex-wrap items-end gap-3">
            <MetricToggle value={ruler} onChange={setRuler} showLabel={false} />
            <button
              onClick={() => setBoard(!board)}
              className={`rounded-md border px-2.5 py-1 font-mono2 text-[11px] transition ${board ? 'border-amber-300/60 bg-amber-300/10 text-amber-200' : 'border-border text-foreground/50 hover:border-foreground/40 hover:text-foreground/80'}`}
            >
              {board ? '← back to one event' : 'see all six at once →'}
            </button>
            </div>
          </div>
          {/* one event large, or all six small: the six-up view is where "Nigeria
              lands next to India" stops being a claim about one plot */}
          {board ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SITS.map((s2) => (
                <button key={s2} onClick={() => { setSituation(s2); setBoard(false) }} className="rounded-lg border border-border p-2 text-left transition hover:border-foreground/40">
                  <div className="font-mono2 text-[10px] text-foreground/55">a {s2}</div>
                  <UmapScatter situation={s2} focus={focus} ruler={ruler} compact />
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-4">
                <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
              </div>
              <div className="mt-6">
                <UmapScatter situation={situation} focus={focus} ruler={ruler} />
              </div>
            </>
          )}
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <Legend focus={focus} onFocus={setFocus} />
            <TierNote
              tier="evidence"
              text="30 sampled images per prompt; every pairwise country gap carries a bootstrap confidence interval, and clustering scores are reported across all six events."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Part I ──────────────────────────────────────────────────────────────── */

/* Scene 04, "Not an average, seed by seed" (finding 3), is DISMISSED 2026-08-10 —
   unmounted, not deleted, same treatment as Part III / Part V / 16·a / 16·d. It now
   lives in `Part1SeedBySeed.tsx`, which nothing imports; that file's header says what
   to restore. Its nearest-cluster tally was moved into scene 03 the same day and stays
   there either way.
   import SeedBySeedScene from './Part1SeedBySeed' */
export default function Part1Default() {
  return (
    <>
      <UnsaidScene />
      <NationalityScene />
      <MapScene />
    </>
  )
}
