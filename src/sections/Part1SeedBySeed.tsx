/* Scene 04 · "Not an average, seed by seed" (finding 3) — DISMISSED 2026-08-10 (Giray).
   Unmounted, not deleted: same treatment as Part III, Part V, 16·a and 16·d (see
   pages/Home.tsx). Nothing imports this file; it is kept intact so the scene can be
   brought back by restoring the import and the <SeedBySeedScene /> in Part1Default's
   default export.

   Note if you do restore it: the nearest-cluster tally that used to sit beside the
   thumbnail strip was moved into scene 03 (the map) on 2026-08-10 and is NOT in here
   any more — scene 03's ClusterTally is now the only copy. Re-mounting this file will
   not duplicate it. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { SceneShell, Reveal, Panel, InfoBox } from '../components/Scene'
import { ZoomImage, BoxPicker, useMagnet } from '../components/Viz'
import { rgb } from '../lib/colors'
import { SITS, COUNTRY8, C8, CV_DEFAULT, F3, SOUTH, type Sit, type Code } from '../data/part1'
import { useModel, modelImg, isSd21, MODEL_NAME } from '../data/modelData'
import { umapFor, f3For, publishedSeeds } from '../data/crossmodel'
import { Legend } from './Part1Default'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))

function SeedScatter({ situation, labels }: { situation: Sit; labels: Code[] }) {
  const { model } = useModel()
  const [hover, setHover] = useState<number | null>(null)
  const data = umapFor(model, situation, 'dinov3')
  const pts = useMemo(() => (data?.points ?? []).filter((p) => p.c === 'default'), [data])
  /* cross-models publish 24 of their 50 thumbnails; hovering an unpublished seed
     shows its label without an image rather than a broken tile */
  const thumbed = useMemo(
    () => (isSd21(model) ? null : new Set(publishedSeeds(model, situation, 'default') ?? [])),
    [model, situation]
  )
  const W = 640
  const H = 420
  const pad = 26
  const X = (x: number) => pad + x * (W - 2 * pad)
  const Y = (y: number) => H - pad - y * (H - 2 * pad)
  /* Keep the scaled content covering the viewport: it spans [t, t + k·L], so t must
     sit in [L(1-k), 0]. At k = 1 that interval collapses to {0}, which is why
     wheeling all the way back restores the full plot. */
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 })
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const { k, tx, ty } = view
  const clampView = (k: number, tx: number, ty: number) => ({
    k,
    tx: Math.min(0, Math.max(W * (1 - k), tx)),
    ty: Math.min(0, Math.max(H * (1 - k), ty)),
  })
  const svgXY = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / box.width) * W,
      y: ((e.clientY - box.top) / box.height) * H,
    }
  }
  /* React registers wheel on the root as a *passive* listener, so preventDefault()
     from an onWheel prop does nothing and the page scrolls away under the cursor.
     Bind it to the node ourselves with { passive: false }. */
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = el.getBoundingClientRect()
      const x = ((e.clientX - box.left) / box.width) * W
      const y = ((e.clientY - box.top) / box.height) * H
      setView((v) => {
        const next = Math.min(12, Math.max(1, v.k * (e.deltaY < 0 ? 1.18 : 1 / 1.18)))
        if (next === v.k) return v
        /* keep the point under the cursor fixed, then clamp */
        return clampView(next, x - ((x - v.tx) / v.k) * next, y - ((y - v.ty) / v.k) * next)
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])
  const zoomed = k > 1.01
  const magnet = useMagnet(
    pts.map((p) => ({ x: tx + k * X(p.xy[0]), y: ty + k * Y(p.xy[1]), item: p.s })),
    (s) => setHover(s)
  )
  if (!data) return null
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full ${drag ? 'cursor-grabbing' : zoomed ? 'cursor-grab' : 'cursor-crosshair'}`}
        ref={svgRef}
        onMouseDown={(e) => setDrag(svgXY(e))}
        onMouseUp={() => setDrag(null)}
        onMouseLeave={() => {
          setDrag(null)
          setHover(null)
        }}
        onMouseMove={(e) => {
          if (!drag) return magnet.onMouseMove(e)
          const { x, y } = svgXY(e)
          setView((v) => clampView(v.k, v.tx + (x - drag.x), v.ty + (y - drag.y)))
          setDrag({ x, y })
        }}
      >
        <g transform={`translate(${tx},${ty}) scale(${k})`}>
          {pts.map((p) => {
            const on = hover === p.s
            return (
              <circle
                key={p.s}
                cx={X(p.xy[0])}
                cy={Y(p.xy[1])}
                r={(on ? 7 : 4) / k}
                fill={rgb(CV_DEFAULT)}
                fillOpacity={on ? 1 : 0.75}
                stroke={on ? 'white' : 'none'}
                strokeWidth={1 / k}
                pointerEvents="none"
              />
            )
          })}
          {COUNTRY8.map((c) => {
            const cen = data.centroids[c.id]
            if (!cen) return null
            return (
              <g key={c.id} pointerEvents="none">
                <circle cx={X(cen[0])} cy={Y(cen[1])} r={8 / k} fill="none" stroke={rgb(c.cv)} strokeWidth={2 / k} />
                <text x={X(cen[0])} y={Y(cen[1]) - 12 / k} textAnchor="middle" fontSize={9 / k} fill={rgb(c.cv)} fontFamily="JetBrains Mono">
                  {c.id}
                </text>
              </g>
            )
          })}
          {/* the hovered seed's assignment, drawn: a line to its nearest centroid in
              that country's colour */}
          {hover != null && (() => {
            const p = pts.find((q) => q.s === hover)
            const cen = data.centroids[labels[hover]]
            if (!p || !cen) return null
            return (
              <line
                x1={X(p.xy[0])}
                y1={Y(p.xy[1])}
                x2={X(cen[0])}
                y2={Y(cen[1])}
                stroke={rgb(C8[labels[hover]].cv)}
                strokeWidth={1.5 / k}
                strokeDasharray={`${5 / k} ${4 / k}`}
                pointerEvents="none"
              />
            )
          })()}
        </g>
      </svg>
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
      <div className="mt-3 flex min-h-[96px] items-center gap-4 rounded-lg border border-border p-3">
        {hover != null ? (
          <>
            {(thumbed == null || thumbed.has(hover)) && (
              <ZoomImage
                src={modelImg(model, situation, 'default', hover)}
                alt={`${situation} default seed ${hover}`}
                caption={`“a ${situation}” · seed ${hover} · nearest country cluster: ${C8[labels[hover]].name}`}
                imgClassName="h-20 w-20 cursor-zoom-in rounded-lg border border-border object-cover"
              />
            )}
            <div className="font-mono2 text-[11px] leading-5 text-foreground/55">
              “a {situation}” · seed {hover}
              <br />
              nearest cluster:{' '}
              <span style={{ color: rgb(C8[labels[hover]].cv) }}>{C8[labels[hover]].name}</span>
            </div>
          </>
        ) : (
          <p className="p-2 font-mono2 text-[11px] text-foreground/35">hover a dot to see its image and nearest cluster</p>
        )}
      </div>
    </div>
  )
}

function SeedBySeedScene() {
  const { model } = useModel()
  const [situation, setSituation] = useState<Sit>('wedding')
  /* B13: this scene was SD 2.1 only, and the number it prints has a real exception
     the page never mentioned — Flux's non-Western share is 0.283 against SD 2.1's
     0.053, and 0.70 in one situation. The per-seed labels are now computed for all
     seven, so the switcher shows the exception instead of hiding it. Thumbnails
     exist for SD 2.1's full 50 only, hence the colour-strip fallback below. */
  const labels = (isSd21(model) ? F3[situation] : f3For(model, situation) ?? F3[situation]) as Code[]
  const allLabels = useMemo(
    () => (isSd21(model) ? SITS.map((s) => F3[s]) : SITS.map((s) => f3For(model, s) ?? F3[s])),
    [model]
  )
  const southTotal = allLabels.flat().filter((l) => SOUTH.includes(l as Code)).length
  const seedTotal = allLabels.flat().length
  /* the looser cut: everything that is not the US or Germany. Stated alongside the
     strict one so the choice of boundary is visible rather than assumed. */
  const nonWestLoose = allLabels.flat().filter((l) => l !== 'US' && l !== 'DE').length
  /* Sixteen seeds to show as pictures, evenly spaced across the ones this model has
     a thumbnail for. SD 2.1 ships all 50 and is absent from the manifest, so it
     spreads over the whole run; the cross-models spread over their published 24.
     Evenly spaced rather than a prefix of the typicality order — the first sixteen
     would be near-identical images and would read as curation. */
  const strip = useMemo(() => {
    const have = isSd21(model)
      ? labels.map((_, i) => i)
      : (publishedSeeds(model, situation, 'default') ?? []).slice().sort((a, b) => a - b)
    const k = Math.min(16, have.length)
    if (k < 2) return have.slice(0, k)
    return Array.from({ length: k }, (_, i) => have[Math.round((i * (have.length - 1)) / (k - 1))])
  }, [model, situation, labels])

  return (
    <SceneShell
      number="04"
      kicker="Part I · the default · finding 3"
      title={<>Not an average, <em className="font-display italic text-amber-200">seed by seed.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          A mean could hide a mixture: half the default seeds Western, half not, cancelling out. So each default seed
          is labeled by the country cluster it lies nearest: of {MODEL_NAME[model]}'s {seedTotal} default seeds,{' '}
          <strong>{southTotal} ({(100 * southTotal / seedTotal).toFixed(1)}%) land nearest India, Nigeria, Indonesia
          or Egypt</strong>.
        </p>
        {/* Review 10 · C-2 and R6: this statistic depends entirely on where "non-Western"
            is cut, and the page used the strict cut without saying so. Recompute with Japan
            and Russia as non-Western and SD 2.1 goes from 5.3% to 35%. Both are now stated. */}
        <p className="prose-scene mt-4 max-w-2xl text-[13px] leading-6 text-foreground/55">
          <strong className="text-foreground/75">That percentage depends on where the line is drawn.</strong> Above,
          “non-Western” means the four Global-South countries only; Russia and Japan sit between the two groups in
          this study's own geometry. Count everything that is not the US or Germany instead and the share becomes{' '}
          <strong className="text-foreground/75">{((100 * nonWestLoose) / seedTotal).toFixed(1)}%</strong>.
        </p>
        {/* The "honest exception" callout is REMOVED 2026-08-06. It fired whenever a
            model's Global-South share cleared 15% and announced that the
            seed-composition claim "does not hold uniformly across models" — which
            framed a different dominant country as a violation. It is not one. This
            scene's claim is that the tendency is a property of individual seeds
            rather than an artifact of averaging, and that holds whichever country
            dominates; the tally beside the strip is where the reader sees which one
            does. The direction result the callout carried was the only statement of
            it on the page, so it moves into the prose below rather than being lost. */}
        <p className="prose-scene mt-4 max-w-2xl text-[13px] leading-6 text-foreground/55">
          Which country dominates differs by model; the direction does not: Nigeria sits farther from a model's own
          default prompt than the USA in{' '}
          <strong className="text-foreground/75">42 of 42 model × situation cells</strong>.
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mt-6 max-w-2xl">
          <InfoBox title="technical detail · why seed by seed">
            Per-seed label: the argmin over the eight country centroids of cosine distance in embedding space, applied to each default-prompt embedding (50 seeds for SD 2.1; cross-models publish 24 thumbnails). The tally is the histogram of those labels; the scatter reuses scene 03's UMAP fit. Flux is the one real exception (28.3% of its default seeds land nearest a Global-South cluster against SD 2.1's 5.3%), shown rather than hidden.
          </InfoBox>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              all {labels.length} default seeds of “a {situation}” · dot colour = nearest country cluster
            </div>
            <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,28rem)_1fr]">
            <div>
              <div className="grid grid-cols-4 gap-1.5">
                {strip.map((seed) => (
                  <span key={seed} className="relative block">
                    <ZoomImage
                      src={modelImg(model, situation, 'default', seed)}
                      alt={`${situation} default seed ${seed}`}
                      caption={`“a ${situation}” · seed ${seed} · nearest country cluster: ${C8[labels[seed]].name}`}
                      imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                    />
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-md"
                      style={{ background: rgb(C8[labels[seed]].cv) }}
                    />
                  </span>
                ))}
              </div>
              <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/45">
                evenly spaced across the seeds with a published thumbnail: a sample of the run, not a pick of it.
              </p>
            </div>
            <div>
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                the same seeds in the map's projection · rings = cluster centroids
              </div>
              <div className="mt-3">
                <SeedScatter situation={situation} labels={labels} />
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <Legend withDefault={false} />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

export default SeedBySeedScene
