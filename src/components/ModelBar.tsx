import { useEffect, useRef, useState } from 'react'
import { MODELS, useModel } from '../data/modelData'

/* The one control that changes which model every switchable chart on the page
   is showing. Parked in the chrome rather than repeated per scene. */
export function ModelBar() {
  const { model, setModel } = useModel()
  const [open, setOpen] = useState(false)
  const current = MODELS.find((m) => m.id === model)!
  const box = useRef<HTMLDivElement>(null)

  /* B6: the dropdown had no Escape, no outside-click and no aria state, so on a
     keyboard it opened and then trapped you. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  /* Review 06 §5d: the bar sat over prose for the whole page with no scroll-away
     behaviour. It now sheds its label once the reader is past the hero, which is the
     cheapest of the two fixes that file proposed and keeps the control always reachable. */
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    /* max-width keeps the bar clear of the ThemeToggle (fixed top-5 right-5): centred
       and unconstrained, a long model name like "Stable Diffusion 3.5 Large" ran under
       the toggle below ~400px. 8rem, not 7: the toggle occupies right-5 + w-10 = 60px,
       and a 7rem cap centred leaves 56px gutters — 4px short, so the bar's right edge
       slid under the toggle exactly when the cap started binding (~390px and below).
       At 768 and 1024 the bar is content-width and nowhere near either gutter. */
    <div className="fixed top-4 left-1/2 z-40 max-w-[calc(100vw-8rem)] -translate-x-1/2">
      {/* Opens on hover so changing model is one click, not two. The click toggle
          stays for touch and keyboard, where there is no hover to open it with, and
          Escape / outside-click still close it. */}
      <div
        ref={box}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-[min(19rem,calc(100vw-8rem))] rounded-xl border border-border bg-background/90 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)] backdrop-blur"
      >
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Model: ${current.name}. Change which model the page shows.`}
          /* w-full + justify-center: the panel below is wider than this row, so the
             box stretches the trigger and left-aligned content then reads as off-centre */
          className={`flex w-full items-center justify-center gap-3 py-2 transition-all ${scrolled ? 'px-3' : 'px-4'}`}
        >
          {/* the label is the first thing to go once the reader knows what the bar is */}
          {!scrolled && (
            <span className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">showing</span>
          )}
          <span className="truncate font-mono2 text-xs text-amber-200">{current.name}</span>
          <span className={`font-mono2 text-[10px] text-foreground/40 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {open && (
          <div role="listbox" aria-label="text-to-image model" className="border-t border-border p-2">
            {MODELS.map((m) => (
              <button
                key={m.id}
                role="option"
                aria-selected={m.id === model}
                onClick={() => { setModel(m.id); setOpen(false) }}
                className={`block w-full rounded-md px-3 py-2 text-left transition ${m.id === model ? 'bg-amber-300/10' : 'hover:bg-foreground/5'}`}
              >
                <div className={`font-mono2 text-xs ${m.id === model ? 'text-amber-200' : 'text-foreground/80'}`}>{m.name}</div>
                <div className="font-mono2 text-[10px] text-foreground/40">{m.sub}</div>
              </button>
            ))}
            <p className="px-3 pt-2 pb-1 font-mono2 text-[9px] leading-4 text-foreground/35">
              All seven ran the same 54 prompts. Charts that can switch follow this; figures measured only on
              Stable Diffusion 2.1 say so where they sit.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* the inline marker a scene shows when it cannot follow the switch */
export function Sd21Only() {
  const { model } = useModel()
  if (model === 'sd21') return null
  return (
    <p className="mt-3 rounded-md border border-amber-300/30 bg-amber-300/5 px-3 py-2 font-mono2 text-[10px] leading-4 text-amber-200/90">
      This measurement was only run on Stable Diffusion 2.1, so it stays on that model while the rest of the page
      follows your selection.
    </p>
  )
}
