import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { AUTHORS } from '../data/references'
import { useTheme } from '../hooks/useTheme'
import { canvasColor } from '../lib/colors'

function LatentNoise() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* B6: this loop used to run forever, including after the reader had scrolled
       past it, and ignored prefers-reduced-motion entirely. A CSS media query
       cannot stop a RAF loop, so both are handled here: draw one static frame and
       stop if reduced motion is requested, and pause whenever the hero is
       off-screen or the tab is hidden. */
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    let w = (canvas.width = canvas.offsetWidth)
    let h = (canvas.height = canvas.offsetHeight)
    const cell = 26
    let raf = 0
    let t = 0
    let visible = true

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', onResize)

    const draw = () => {
      t += 0.012
      ctx.clearRect(0, 0, w, h)
      const cols = Math.ceil(w / cell)
      const rows = Math.ceil(h / cell)
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const n =
            Math.sin(x * 0.7 + t) * Math.cos(y * 0.9 - t * 0.7) * 0.5 +
            Math.sin((x + y) * 0.35 + t * 1.3) * 0.5
          const a = Math.max(0, n) ** 3 * 0.16
          if (a < 0.004) continue
          // warm amber in the center-left, cool blue elsewhere: the "prior" tinting the noise
          const warm = Math.max(0, 1 - Math.hypot(x - cols * 0.32, y - rows * 0.42) / (cols * 0.5))
          ctx.fillStyle = warm > 0.35 ? canvasColor('--c-amber', a * warm) : canvasColor('--c-blue', a * 0.8)
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2)
        }
      }
      if (!reduced && visible) raf = requestAnimationFrame(draw)
    }
    draw()

    // pause off-screen; an animation nobody can see is pure battery drain
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !reduced) { cancelAnimationFrame(raf); draw() }
    })
    io.observe(canvas)
    const onVis = () => {
      visible = !document.hidden
      if (visible && !reduced) { cancelAnimationFrame(raf); draw() }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', onResize)
    }
  }, [theme])

  return <canvas ref={ref} className="noise-canvas" />
}

export default function Hero() {
  return (
    <header className="relative flex flex-col overflow-hidden">
      <LatentNoise />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_78%)]" />

      <div /* max-w-6xl, not 5xl: every other section on the page is 6xl, so a 5xl hero
           centred itself 4rem inside them and the title, byline and kicker all sat
           indented against the introduction directly beneath. */
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pt-28 pb-16">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <div className="font-mono2 text-[11px] tracking-[0.35em] uppercase text-amber-200/70">
            An interactive explorable · explainable AI × human–computer interaction
          </div>
        </motion.div>

        <motion.h1
          className="font-display mt-8 max-w-4xl text-5xl leading-[1.02] font-light tracking-tight md:text-7xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Restored in full 2026-08-11: the earlier removal misread Giray, who
              wanted the emphasis dropped, not the clause. No accent on any part of
              it — no phrase here carries more weight than the rest.

              Capitalised "The" is Giray's, written that way three times. It is not
              standard title case (articles stay lowercase mid-title); left as the
              author writes it rather than corrected again. */}
          Exploring The Geographic Assumptions in Text-to-Image Models with Underspecified Prompts
        </motion.h1>

        {/* Authors / Affiliations, 2026-08-10 (Giray). Two columns in the idiom the
            page already uses for label/value pairs. Every author shares one
            affiliation, so it is carried by a single asterisk rather than repeated
            five times; AUTHORS in data/references.ts holds the per-author strings if
            they ever diverge. */}
        <motion.div
          className="mt-10 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.28 }}
        >
          <div className="grid gap-x-10 gap-y-3 border-t border-border pt-5 sm:grid-cols-2">
            <div>
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">authors</div>
              <ul className="mt-2.5 space-y-1 text-[15px] leading-6 text-foreground/85">
                {AUTHORS.map((a) => (
                  <li key={a.name}>
                    <a
                      href={`mailto:${a.email}`}
                      className="underline decoration-border underline-offset-2 hover:decoration-amber-200"
                    >
                      {a.name}
                    </a>
                    <sup className="ml-0.5 text-amber-200/80">*</sup>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">affiliations</div>
              <p className="mt-2.5 text-[15px] leading-6 text-foreground/70">
                <sup className="text-amber-200/80">*</sup> Johannes Kepler University Linz
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </header>
  )
}
