/* Scene 04 · "Not an average, seed by seed" (finding 3).

   Dismissed 2026-08-10 and RESTORED the same day (Giray), for the 4x4 grid of real
   seeds: it is the only place on the page where a reader sees the distribution as
   individual pictures rather than as a statistic about them.

   It lives in its own file rather than back inside Part1Default because that is
   where it was parked; nothing about it needs to move. Note the nearest-cluster
   tally that used to sit beside the strip now lives in scene 03 (the map) as
   ClusterTally and is deliberately NOT duplicated here, so this scene is the strip
   and the scatter. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { SceneShell, Reveal, Panel } from '../components/Scene'
import { ZoomImage, BoxPicker, useMagnet } from '../components/Viz'
import { rgb } from '../lib/colors'
import { SITS, COUNTRY8, C8, CV_DEFAULT, F3, SOUTH, type Sit, type Code } from '../data/part1'
import { useModel, modelImg, isSd21 } from '../data/modelData'
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

function SeedBySeedScene() {
  const { model } = useModel()
  const [situation, setSituation] = useState<Sit>('wedding')
  /* B13: this scene was SD 2.1 only, and the number it prints has a real exception
     the page never mentioned — Flux's non-Western share is 0.283 against SD 2.1's
     0.053, and 0.70 in one situation. The per-seed labels are now computed for all
     seven, so the switcher shows the exception instead of hiding it. Thumbnails
     exist for SD 2.1's full 50 only, hence the colour-strip fallback below. */
  const labels = (isSd21(model) ? F3[situation] : f3For(model, situation) ?? F3[situation]) as Code[]
  /* allLabels / southTotal / seedTotal / nonWestLoose fed the old opening paragraph,
     which the
     section text replaced on 2026-08-10. They are the strict and loose non-Western
     cuts (5.3% vs 35% on SD 2.1) — if a share is ever quoted here again, quote both,
     because the number depends entirely on where the line is drawn (review 10 · C-2).
       const southTotal = allLabels.flat().filter((l) => SOUTH.includes(l as Code)).length
       const seedTotal = allLabels.flat().length
  /* the looser cut: everything that is not the US or Germany. Stated alongside the
     strict one so the choice of boundary is visible rather than assumed. *\/
       const nonWestLoose = allLabels.flat().filter((l) => l !== 'US' && l !== 'DE').length
  */
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
      number="03"
      kicker="image by image"
      title={<>Not an average, <em className="font-display italic text-amber-200">image by image.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The distance shown above summarizes all 50 generations with a single value, which can hide what happens for
          individual images. For example, a set generated from a geographically unspecified prompt may be close to
          the United States on average because almost all its 50 images are somewhat close to the United States, or
          some are very close to the United States while others are close to different countries.
        </p>
        <p className="prose-scene mt-4 max-w-2xl">
          In the following figure, we therefore examine each geographically unspecified generation separately and ask
          which country-specific set it is closest to. For each geographically unspecified generation, we identify the
          nearest geographic reference by comparing its embedding with the centroid of each of the eight
          country-specific sets using cosine distance. Each image is assigned to the country with the smallest
          distance. The figure below shows 16 images per scene, spaced evenly across the run rather than sampled at
          random, and gives the per-country counts over all 50 generations as a bar chart.
        </p>
        <p className="prose-scene mt-4 max-w-2xl">
          This individual-image analysis shows that most geographically unspecified generations are closer to the
          United States and Germany than to India, Nigeria, Indonesia, or Egypt. Therefore, the geographic alignment
          observed in the averaged distances is also present across individual generations rather than being driven
          only by averaging, which is further aligned with UMAP projection.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              all {labels.length} default seeds of “a {situation}” · dot colour = nearest country cluster
            </div>
            <BoxPicker label="scene" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
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
              <div className="mt-5">
                <ClusterTally situation={situation} />
              </div>
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
