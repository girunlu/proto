import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import { ThemeProvider } from './hooks/useTheme'
import { ThemeToggle } from './components/ThemeToggle'

export default function App() {
  return (
    <ThemeProvider>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </ThemeProvider>
  )
}
