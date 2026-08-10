import { useEffect, useRef, useState } from 'react'
import { pickActive } from '../lib/utils'

const STOPS = [
  { id: 'start', label: '· what this is' },
  { id: 'p1', label: 'I · the default' },
  { id: 'p4', label: 'II · assumptions' },
  // ids are historical, the order is not: the mechanism (#p2) moved ahead of the
  // escape (#p3) on 2026-08-10. Anchors kept stable so old links still land.
  { id: 'p2', label: 'III · the mechanism' },
  { id: 'p3', label: 'IV · the escape' },
  /* No stop for #xa (across models): it moved inside the extras on 2026-08-10 and
     that section is mounted only once opened, so a dot for it would point at
     nothing most of the time. #p6 is the way in. */
  { id: 'p6', label: '+ · extras' },
  { id: 'closing', label: '∴ · closing' },
]

export function NavRail() {
  const [active, setActive] = useState('')
  /* A click is pinned until the reader scrolls by hand. Jumping to an anchor is
     a scroll like any other, and two things routinely land the tracker on a
     neighbour while the reader is looking at exactly the section they asked
     for: the smooth-scroll animation fires a scroll event per frame the whole
     way there, and thumbnails above finishing their load push everything below
     them down *after* the jump has been computed. Neither is worth chasing when
     the reader has already told us where they are. Released by the first real
     gesture, never by the programmatic scroll itself. */
  const pinned = useRef<string | null>(null)

  useEffect(() => {
    const release = () => {
      pinned.current = null
    }
    const onScroll = () => {
      if (pinned.current) {
        setActive(pinned.current)
        return
      }
      const measured = STOPS.map((s) => ({
        id: s.id,
        top: document.getElementById(s.id)?.getBoundingClientRect().top ?? null,
      }))
      /* At the bottom of the page nothing below can still cross the mark, so a
         short final section would never light up on its own — the extras
         collapse to a single button, well under half a viewport. */
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      setActive(atEnd ? STOPS[STOPS.length - 1].id : pickActive(measured, window.innerHeight * 0.45))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    // mousedown covers dragging the scrollbar, which fires no wheel event
    const GESTURES = ['wheel', 'touchmove', 'keydown', 'mousedown'] as const
    for (const g of GESTURES) window.addEventListener(g, release, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      for (const g of GESTURES) window.removeEventListener(g, release)
    }
  }, [])

  return (
    <nav className="fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-1 lg:flex">
      {STOPS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={() => {
            pinned.current = s.id
            setActive(s.id)
          }}
          className="group flex items-center gap-2.5 py-2"
        >
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
