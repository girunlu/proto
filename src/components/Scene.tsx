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

/* The page's type scale, top to bottom. Adding the section leads on 2026-08-10 put
   a 3xl/4xl heading directly above the 4xl/5xl scene titles it governed, so the
   headline was a step smaller than its own subheads. The scale is now strictly
   descending and nothing else should be inserted into it without moving a level:

     hero title            5xl / 7xl
     section heading       4xl / 5xl   ← the leads, and `lead` scenes below
     scene title           3xl / 4xl
     in-scene subhead      2xl / 3xl

   `lead` marks a scene that IS a section — introduction, conclusion, references,
   acknowledgements have no separate lead above them, so they carry section size. */
export function SceneShell({
  number,
  kicker,
  title,
  children,
  id,
  lead = false,
}: {
  number: string
  /* optional: a section whose title already IS its name (Acknowledgements) would
     otherwise print the same word twice, six pixels apart */
  kicker?: string
  title: ReactNode
  children: ReactNode
  id?: string
  lead?: boolean
}) {
  return (
    <section id={id} className="relative mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <Reveal>
        <div className="scene-number">{number}</div>
        {kicker && (
          <div className="mt-2 font-mono2 text-xs tracking-[0.2em] uppercase text-foreground/40">{kicker}</div>
        )}
        <h2
          className={`font-display mt-4 max-w-3xl leading-[1.08] font-light ${
            lead ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'
          }`}
        >
          {title}
        </h2>
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  )
}

/* One heading per section, named exactly as the NavRail names it (2026-08-11,
   Giray). Before this, a section announced itself three times over: a PartDivider
   rule carrying the rail's label, then an <h2> paraphrasing it, then the first
   scene's kicker prefixing it again. The rail's label is now the only name, the
   divider's caption became this subtitle, and the scene kickers dropped their
   section prefix. Titles live in Home.tsx beside the section structure, so the
   rail and the page cannot drift apart. */
export function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mx-auto mt-28 w-full max-w-6xl px-6">
      <Reveal>
        <div className="flex items-center gap-4">
          <span className="h-px w-10 shrink-0 bg-amber-300/30" />
          <h2 className="font-display max-w-4xl text-4xl leading-tight font-light md:text-5xl">{title}</h2>
        </div>
        <p className="mt-4 ml-14 max-w-2xl text-[15px] leading-6 text-foreground/50">{sub}</p>
      </Reveal>
    </div>
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
