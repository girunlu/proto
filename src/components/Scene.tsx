import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SceneShell({
  number,
  kicker,
  title,
  children,
  id,
}: {
  number: string
  kicker: string
  title: ReactNode
  children: ReactNode
  id?: string
}) {
  return (
    <section id={id} className="relative mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <Reveal>
        <div className="scene-number">{number}</div>
        <div className="mt-2 font-mono2 text-xs tracking-[0.2em] uppercase text-foreground/40">{kicker}</div>
        <h2 className="font-display mt-4 max-w-3xl text-4xl leading-[1.08] font-light md:text-5xl">{title}</h2>
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  )
}

export function TierNote({ tier, text }: { tier: 'evidence' | 'illustration' | 'sim'; text: string }) {
  void tier // badges removed per design feedback; the note text stays as a quiet footnote
  return <p className="font-mono2 text-[11px] leading-5 text-foreground/45">{text}</p>
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card/80 p-6 shadow-[0_0_60px_-20px_rgba(0,0,0,0.8)] md:p-8 ${className}`}>
      {children}
    </div>
  )
}

/* An expandable background/mechanism note: one short paragraph, there for readers
   who want it, out of the way of the visuals for everyone else. */
export function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-background/40">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3.5 py-2.5 font-mono2 text-[10px] tracking-wider text-foreground/45 uppercase transition hover:text-foreground/80"
      >
        {title}
        <span className="text-foreground/30">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-3.5 pb-3.5 text-[13px] leading-6 text-foreground/60">{children}</div>}
    </div>
  )
}
