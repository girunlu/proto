import { useEffect, useState } from 'react'

const STOPS = [
  { id: 'start', label: '· what this is' },
  { id: 'p1', label: 'I · the default' },
  { id: 'p4', label: 'II · assumptions' },
  { id: 'p3', label: 'III · the escape' },
  { id: 'p2', label: 'IV · the mechanism' },
  { id: 'xa', label: 'V · across models' },
  // p6 is the extras section (guidance knob + what a clause can move), near the end
  { id: 'p6', label: '+ · extras' },
  { id: 'closing', label: '∴ · closing' },
]

export function NavRail() {
  const [active, setActive] = useState('')

  /* Scroll-position tracking instead of an IntersectionObserver band: with tall
     sections near the page end and dividers between the observed wrappers, the
     observer could leave the highlight stuck on an earlier stop. This just picks
     the last stop whose top has passed the 45% line — always defined, never stuck. */
  useEffect(() => {
    const onScroll = () => {
      const mark = window.innerHeight * 0.45
      let current = STOPS[0].id
      for (const s of STOPS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= mark) current = s.id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-1 lg:flex">
      {STOPS.map((s) => (
        <a key={s.id} href={`#${s.id}`} className="group flex items-center gap-2.5 py-2">
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
