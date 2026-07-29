import { useState } from 'react'
import { MODELS, useModel } from '../data/modelData'

/* The one control that changes which model every switchable chart on the page
   is showing. Parked in the chrome rather than repeated per scene. */
export function ModelBar() {
  const { model, setModel } = useModel()
  const [open, setOpen] = useState(false)
  const current = MODELS.find((m) => m.id === model)!

  return (
    <div className="fixed top-4 left-1/2 z-40 -translate-x-1/2">
      <div className="rounded-xl border border-border bg-background/90 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)] backdrop-blur">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 px-4 py-2"
        >
          <span className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">showing</span>
          <span className="font-mono2 text-xs text-amber-200">{current.name}</span>
          <span className={`font-mono2 text-[10px] text-foreground/40 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {open && (
          <div className="border-t border-border p-2">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setModel(m.id); setOpen(false) }}
                className={`block w-full rounded-md px-3 py-2 text-left transition ${m.id === model ? 'bg-amber-300/10' : 'hover:bg-foreground/5'}`}
              >
                <div className={`font-mono2 text-xs ${m.id === model ? 'text-amber-200' : 'text-foreground/80'}`}>{m.name}</div>
                <div className="font-mono2 text-[10px] text-foreground/40">{m.sub}</div>
              </button>
            ))}
            <p className="px-3 pt-2 pb-1 font-mono2 text-[10px] leading-4 text-foreground/35">
              The same 54 prompts were run in full on all seven. Charts that can switch will follow this control;
              scenes measured only on Stable Diffusion 2.1 say so where they sit.
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
