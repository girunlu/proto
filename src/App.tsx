import { MotionConfig } from 'framer-motion'
import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import { ThemeProvider } from './hooks/useTheme'
import { ThemeToggle } from './components/ThemeToggle'

export default function App() {
  return (
    /* reducedMotion="user" makes every framer-motion animation on the page respect
       prefers-reduced-motion. The CSS rule in index.css cannot: it only zeroes CSS
       animation and transition durations, and every animation here is JS-driven —
       Reveal wraps essentially all content in whileInView, and the charts animate
       widths and heights through motion.div. Transform and opacity animations are
       neutralised; layout-independent ones (colour, width) still run, which is the
       behaviour the spec asks for. */
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ThemeToggle />
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </ThemeProvider>
    </MotionConfig>
  )
}
