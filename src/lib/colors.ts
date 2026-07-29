// Theme-aware color helpers. Data modules store CSS-variable NAMES ('--c-ng');
// components resolve them through these so charts flip with the theme.
export const rgb = (v: string) => `rgb(var(${v}))`
export const rgba = (v: string, a: number) => `rgb(var(${v}) / ${a})`

/** Resolve a triplet token to a canvas-safe rgba() string. */
export function canvasColor(v: string, a: number): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(v).trim()
  return `rgba(${raw.split(/\s+/).join(',')},${a})`
}
