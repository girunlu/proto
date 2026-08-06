import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { rgb, rgba } from '../lib/colors'

/* ── hover-to-inspect ─────────────────────────────────────────────────────────
   Small thumbnails everywhere in this page are unreadable at their layout size.
   Hovering one pins a large copy in a fixed corner panel: readable, and it never
   covers the chart you are reading it from. */

export function ZoomImage({
  src, alt, caption, className = '', imgClassName = '',
}: {
  src: string
  alt: string
  caption?: ReactNode
  className?: string
  imgClassName?: string
}) {
  const [on, setOn] = useState(false)
  return (
    <span
      className={`relative block ${className}`}
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
    >
      <img src={src} alt={alt} loading="lazy" className={imgClassName} />
      {on && (
        <span className="pointer-events-none fixed right-6 bottom-6 z-50 block w-[300px] rounded-xl border border-amber-300/40 bg-background/95 p-2 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur">
          <img src={src} alt="" className="w-full rounded-lg" />
          <span className="mt-1.5 block font-mono2 text-[10px] leading-4 text-foreground/60">
            {caption ?? alt}
          </span>
        </span>
      )}
    </span>
  )
}

/* ── pickers ──────────────────────────────────────────────────────────────────
   Native selects: fixed width, so switching a country never re-flows the panel
   around it (chip rows did, and jumped the layout under the cursor). */

export function Picker<T extends string>({
  label, value, onChange, options, width = 'w-44', accent,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  width?: string
  accent?: string
}) {
  return (
    <label className="flex shrink-0 flex-col gap-1">
      <span className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${width} rounded-md border border-border bg-background/80 px-2.5 py-1.5 font-mono2 text-xs text-foreground/85 outline-none transition focus:border-amber-300/60`}
        style={accent ? { color: rgb(accent), borderColor: rgba(accent, 0.5) } : undefined}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

/* ── box selector ─────────────────────────────────────────────────────────────
   The same choice as Picker, laid out as one visible box per option. A dropdown
   hides how many options there are and takes two clicks to compare two of them;
   with six events or eight countries the whole set fits on one line, so the
   reader can see the alternatives without opening anything. Each option can carry
   its own accent colour, which the country row uses to match the charts. */

export function BoxPicker<T extends string>({
  label, value, onChange, options, size = 'md',
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; cv?: string }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className={`rounded-md border font-mono2 transition ${
                size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
              } ${on ? 'bg-foreground/8' : 'border-border text-foreground/45 hover:border-foreground/40 hover:text-foreground/80'}`}
              style={
                on
                  ? {
                      color: o.cv ? rgb(o.cv) : rgb('--c-amber-t'),
                      borderColor: o.cv ? rgba(o.cv, 0.6) : rgba('--c-amber', 0.6),
                    }
                  : undefined
              }
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── bars ─────────────────────────────────────────────────────────────────────
   One row = label column, track, and a fixed value column. The confidence
   interval is drawn as a bracket *below* the bar inside the track, so it can
   never run across the number the way the old floating labels did. */

export function BarRow({
  label, value, ci, max, color, animate = true, delay = 0, right, labelWidth = 'w-32',
  onSelect, selected = false, dimmed = false,
}: {
  label: ReactNode
  value: number
  ci?: [number, number]
  max: number
  color: string
  animate?: boolean
  delay?: number
  right?: ReactNode
  labelWidth?: string
  /* optional: makes the row a selector for the panel it lives in, so a chart of
     nine prompts can double as the picker for which pair the images show. */
  onSelect?: () => void
  selected?: boolean
  dimmed?: boolean
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`
  return (
    <div
      className={`flex items-center gap-3 rounded-md transition ${
        onSelect ? 'cursor-pointer px-2 -mx-2 py-0.5' : ''
      } ${selected ? 'bg-foreground/[0.07]' : onSelect ? 'hover:bg-foreground/[0.04]' : ''} ${
        dimmed ? 'opacity-45' : ''
      }`}
      onClick={onSelect}
    >
      <span className={`${labelWidth} shrink-0 text-right font-mono2 text-[11px] leading-4 text-foreground/60`}>{label}</span>
      <div className="relative h-6 flex-1">
        <motion.div
          className="absolute inset-y-0 left-0 rounded"
          style={{ background: `linear-gradient(90deg, ${rgba(color, 0.25)}, ${rgb(color)})` }}
          initial={{ width: 0 }}
          animate={animate ? { width: pct(value) } : undefined}
          whileInView={animate ? undefined : { width: pct(value) }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* the uncertainty range, drawn through the bar on the same centre line
            with end caps, so it reads as an interval around the value rather
            than as a second, unrelated mark floating underneath it */}
        {ci && (
          <span
            className="pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center"
            style={{ left: pct(ci[0]), width: `${((ci[1] - ci[0]) / max) * 100}%` }}
            title={`the true value is very likely between ${ci[0].toFixed(3)} and ${ci[1].toFixed(3)}`}
          >
            <span className="h-2.5 w-px bg-foreground/70" />
            <span className="h-px flex-1 bg-foreground/70" />
            <span className="h-2.5 w-px bg-foreground/70" />
          </span>
        )}
      </div>
      <span className="w-14 shrink-0 text-right font-mono2 text-xs" style={{ color: rgb(color) }}>
        {value.toFixed(2)}
      </span>
      {right && <span className="w-28 shrink-0 font-mono2 text-[10px] text-foreground/45">{right}</span>}
    </div>
  )
}

/* a two-option metric switch, used wherever a number can be recomputed with a
   second, independently trained vision model */
export function MetricToggle({ value, onChange, showLabel = true }: {
  value: 'dinov3' | 'clip'
  onChange: (v: 'dinov3' | 'clip') => void
  /* off where the surrounding panel already makes the two buttons self-evident */
  showLabel?: boolean
}) {
  return (
    <label className="flex shrink-0 flex-col gap-1">
      {showLabel && (
        <span className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">measured with</span>
      )}
      <div className="flex overflow-hidden rounded-md border border-border font-mono2 text-xs">
        {([['dinov3', 'DINOv3'], ['clip', 'CLIP']] as const).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`px-3 py-1.5 transition ${value === k ? 'bg-amber-300/15 text-amber-200' : 'text-foreground/40 hover:text-foreground/70'}`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </label>
  )
}

/* ── the distance ruler ───────────────────────────────────────────────────────
   Nobody arrives at this page knowing what "0.53" means. Every distance chart
   carries this scale so the number has a referent. */

const RULER_STOPS = [
  { v: 0.0, t: 'the same prompt, twice', d: 'identical wording, different seeds' },
  { v: 0.06, t: '“a wedding” vs “a wedding in the USA”', d: 'the same pictures, essentially' },
  { v: 0.26, t: 'the empty prompt vs any default', d: 'no prompt at all, for scale' },
  { v: 0.53, t: '“a wedding” vs “a wedding in Nigeria”', d: 'most of the way to another event' },
  { v: 0.8, t: '“a wedding” vs “a breakfast”', d: 'two unrelated events: the ceiling' },
]

/* One row per anchor, so no two labels can ever collide. The little track on
   the right doubles as the scale itself. */
export function DistanceRuler({ max = 0.9 }: { max?: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
        how to read a distance
      </div>
      <p className="mt-2 max-w-3xl text-[13px] leading-6 text-foreground/65">
        Every image is turned into a list of numbers by a vision model that was never trained on this
        study, and the distance is how far apart two sets of 50 such images sit. It has no unit, so
        here is the same scale written in prompts you can picture.
      </p>
      <div className="mt-4 space-y-1.5">
        {RULER_STOPS.map((s) => (
          <div key={s.v} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-right font-mono2 text-[12px] text-amber-200">{s.v.toFixed(2)}</span>
            <div className="relative h-4 w-24 shrink-0 rounded-sm bg-foreground/8 sm:w-32">
              <div className="absolute inset-y-0 left-0 rounded-sm bg-amber-300/45" style={{ width: `${(s.v / max) * 100}%` }} />
            </div>
            <span className="min-w-0 flex-1 font-mono2 text-[11px] leading-4 text-foreground/70">
              {s.t}
              <span className="text-foreground/40"> · {s.d}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── what a k-NN separability score is ───────────────────────────────────────── */

export function KnnNote({ auc }: { auc?: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
        the sorting test, in the right-hand column
      </div>
      {/* R5.1: this described a classification procedure ("sort them into two
          piles", "scores 50%") for a ranking statistic. AUC is the probability
          that a randomly chosen country image outranks a randomly chosen
          default-prompt one — so the wording is now a ranking, not an accuracy. */}
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-foreground/65">
        A distance can look small and still matter, so we ran a second, blunter check. Take one
        default-prompt image and one country image at random, and ask a simple program which is which,
        using nothing but the pictures. The score is how often it puts the country image on the right
        side of the line. If both prompts generated the same world it is guessing, and scores{' '}
        <strong className="text-foreground">50%</strong>. A score of{' '}
        <strong className="text-foreground">100%</strong> means the two sets never overlap.
        {auc != null && (
          <>
            {' '}Here it scores <strong className="text-foreground">{Math.round(auc * 100)}%</strong>.
          </>
        )}
      </p>
    </div>
  )
}

/* ── magnet hover for scatter plots ───────────────────────────────────────────
   Chasing a 4px dot with a cursor is a nuisance, so an invisible capture layer
   over the whole plot resolves the pointer to the nearest point instead. Returns
   the handlers plus the crosshair the caller can draw at the snapped position. */

export function useMagnet<T>(
  points: { x: number; y: number; item: T }[],
  onHover: (item: T | null, index: number) => void
) {
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const box = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const x = ((e.clientX - box.left) / box.width) * vb.width
    const y = ((e.clientY - box.top) / box.height) * vb.height
    let best = -1
    let bestD = Infinity
    points.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < bestD) { bestD = d; best = i }
    })
    if (best >= 0) onHover(points[best].item, best)
  }
  return { onMouseMove }
}

/* ── a labelled step explainer used above the harder scenes ──────────────────── */

export function HowItWorks({ steps }: { steps: { k: string; v: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((s) => (
        <div key={s.k} className="rounded-lg border border-border bg-background/40 p-3">
          <div className="font-mono2 text-[10px] tracking-wider text-amber-200/80 uppercase">{s.k}</div>
          <p className="mt-1.5 text-[12px] leading-5 text-foreground/60">{s.v}</p>
        </div>
      ))}
    </div>
  )
}

/* ── a share-of-50 meter, used wherever a VQA answer distribution is shown ───── */

export function ShareBar({
  label, value, n, total = 50, color = '--c-amber', note,
}: {
  label: string
  value: string
  n: number
  total?: number
  color?: string
  note?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/45" title={label}>
        {label}
      </span>
      <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-foreground/8">
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{ background: rgba(color, 0.5) }}
          initial={{ width: 0 }}
          whileInView={{ width: `${(n / total) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        />
        <span className="absolute inset-y-0 left-2 flex items-center font-mono2 text-[10px] text-foreground/85">
          {value}
        </span>
      </div>
      <span className="w-14 shrink-0 text-right font-mono2 text-[10px] text-foreground/50">
        {n}/{total}
      </span>
      {note}
    </div>
  )
}
