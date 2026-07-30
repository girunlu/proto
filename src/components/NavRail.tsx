import { useEffect, useState } from 'react'

const STOPS = [
  { id: 'start', label: '— · what this is' },
  { id: 'p1', label: 'I · the default' },
  { id: 'p2', label: 'II · the mechanism' },
  { id: 'p3', label: 'III · the override' },
  { id: 'p4', label: 'IV · assumptions' },
  { id: 'p5', label: 'V · reality' },
  { id: 'p6', label: 'VI · the escape' },
  { id: 'xa', label: 'VII · across models' },
  { id: 'closing', label: '∴ · closing' },
]

export function NavRail() {
  const [active, setActive] = useState('')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-40% 0px -50% 0px' }
    )
    STOPS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <nav className="fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-4 lg:flex">
      {STOPS.map((s) => (
        <a key={s.id} href={`#${s.id}`} className="group flex items-center gap-2.5">
          <span
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active === s.id ? 'w-6 bg-amber-300' : 'w-1.5 bg-foreground/25 group-hover:bg-foreground/60'
            }`}
          />
          <span
            className={`font-mono2 text-[10px] tracking-wider uppercase transition-opacity ${
              active === s.id ? 'text-amber-200 opacity-100' : 'text-foreground/40 opacity-0 group-hover:opacity-100'
            }`}
          >
            {s.label}
          </span>
        </a>
      ))}
    </nav>
  )
}
