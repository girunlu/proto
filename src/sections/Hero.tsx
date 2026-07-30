import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { THESIS } from '../data/research'
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

    let w = (canvas.width = canvas.offsetWidth)
    let h = (canvas.height = canvas.offsetHeight)
    const cell = 26
    let raf = 0
    let t = 0

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
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [theme])

  return <canvas ref={ref} className="noise-canvas" />
}

export default function Hero() {
  return (
    <header className="relative flex min-h-[100svh] flex-col overflow-hidden">
      <LatentNoise />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_78%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-24">
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
          What do text-to-image models
          <br />
          <span className="italic text-amber-200">assume before you say anything?</span>
        </motion.h1>

        <motion.div
          className="mt-12 flex flex-col gap-3 font-mono2 text-sm md:text-base"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-52 shrink-0 text-[11px] tracking-widest text-foreground/40 uppercase">what you think happens</span>
            <span className="text-foreground/40 line-through decoration-red-400/70 decoration-2">image = f( prompt )</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-52 shrink-0 text-[11px] tracking-widest text-amber-200/70 uppercase">what actually happens</span>
            <span className="text-amber-200">image ~ P( · | prompt, the model's worldview )</span>
          </div>
        </motion.div>

        <motion.p
          className="mt-10 max-w-2xl text-lg leading-8 text-foreground/70"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          Your prompt is never the whole input. It is read inside a worldview the model learned before you arrived:
          decisions about who a person looks like, which culture is the default, and what “realistic” means. You cannot
          see that second condition, and you cannot opt out of it. This explorable makes it visible: where it lives,
          when it locks in, and what it costs to override.
        </motion.p>

        <motion.div
          className="mt-14 max-w-2xl border-l-2 border-amber-300/50 pl-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.85 }}
        >
          <p className="font-display text-xl leading-7 text-foreground/85 italic md:text-2xl">“{THESIS}”</p>
          <p className="mt-3 font-mono2 text-[11px] tracking-wider text-foreground/40 uppercase">
            6 situations × 9 prompt variants × 50 fixed seeds, run in full on seven text-to-image models · 33,676 generated images measured in total
          </p>
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 flex justify-center pb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
      >
        <div className="flex flex-col items-center gap-2 text-foreground/40">
          <span className="font-mono2 text-[10px] tracking-[0.3em] uppercase">scroll to begin</span>
          <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="text-amber-200/80">
            ↓
          </motion.span>
        </div>
      </motion.div>
    </header>
  )
}
