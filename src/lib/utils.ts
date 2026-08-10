import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 1st, 2nd, 3rd, 4th … 11th, 21st. Ranks here run to 50, so the teens matter:
    one caller printed a bare "th" ("1th most typical") and the other stopped
    handling the exception at 3, which would have said "21th". */
export function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** Round tick values inside [lo, hi] — 0.20 / 0.25 / 0.30, never 0.213 / 0.264.
    The scatters used `lo + f*(hi-lo)` for fixed fractions, which produced labels
    nobody can read a value off (review 01 · R5.3). Standard 1/2/5 × 10ⁿ steps;
    `count` is a target, not a promise, which is what "nice" costs. */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!(hi > lo)) return [lo]
  const mag = 10 ** Math.floor(Math.log10((hi - lo) / count))
  const at = (step: number) => {
    /* Round to the step's own decimal place. `Math.round(v / step) * step` is the
       obvious version and it does not work — 6 * 0.05 is 0.30000000000000004, so the
       drift comes back on the multiply. Labels are read off these values. */
    const dp = Math.max(0, -Math.floor(Math.log10(step)))
    const out: number[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
      out.push(Number(v.toFixed(dp)))
    }
    return out
  }
  /* pick the step whose tick count lands nearest the target rather than the first
     step wide enough. Taking the first overshoots on wide ranges — [3, 97] chose a
     step of 50 and drew one tick. Ties go to the denser option. */
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10].map((m) => m * mag)
  let best = at(candidates[0])
  for (const step of candidates.slice(1)) {
    const t = at(step)
    if (t.length >= 2 && Math.abs(t.length - count) <= Math.abs(best.length - count)) best = t
  }
  return best.length >= 2 ? best : [lo, hi]
}

/** Which nav stop is the reader in? The last one *down the page* whose top has
    passed `mark` — so the winner is the greatest `top` still ≤ mark.

    The version this replaces assigned the winner by iterating the stop list and
    keeping the final match, which silently required that list to be written in
    DOM order. Nothing enforced it, and reordering the page's parts is exactly
    the edit that breaks it: a stop listed before one that actually sits above it
    can never hold the highlight, because the later array entry always overwrites
    it. Comparing measured positions has no such requirement.

    `top: null` = the stop's element is not in the DOM (a dismissed part); it is
    skipped rather than treated as position 0. */
export function pickActive(stops: { id: string; top: number | null }[], mark: number): string {
  let current = stops[0].id
  let lowest = -Infinity
  for (const s of stops) {
    if (s.top == null || s.top > mark || s.top <= lowest) continue
    lowest = s.top
    current = s.id
  }
  return current
}
