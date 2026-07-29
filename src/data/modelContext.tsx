// ─────────────────────────────────────────────────────────────────────────────
// The global model switch. Every scene that has cross-model data reads from
// here, so "show me another model" is one control rather than one per chart.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react'

export type ModelId =
  | 'sd21' | 'flux_cultural' | 'kolors_cultural' | 'sdxl_cultural'
  | 'sd35_cultural' | 'qwenimage_cultural' | 'hunyuandit_cultural'

export const MODELS: { id: ModelId; name: string; sub: string }[] = [
  { id: 'sd21', name: 'Stable Diffusion 2.1', sub: 'Stability · 2022 · the model this study examines in depth' },
  { id: 'sdxl_cultural', name: 'SDXL 1.0', sub: 'Stability · 2023' },
  { id: 'sd35_cultural', name: 'Stable Diffusion 3.5 Large', sub: 'Stability · 2024' },
  { id: 'flux_cultural', name: 'FLUX.1 [dev]', sub: 'Black Forest Labs · 2024' },
  { id: 'kolors_cultural', name: 'Kolors', sub: 'Kuaishou · 2024 · trained on Chinese-language data' },
  { id: 'hunyuandit_cultural', name: 'HunyuanDiT', sub: 'Tencent · 2024' },
  { id: 'qwenimage_cultural', name: 'Qwen-Image', sub: 'Alibaba · 2025' },
]
export const MODEL_NAME = Object.fromEntries(MODELS.map((m) => [m.id, m.name])) as Record<ModelId, string>

const Ctx = createContext<{ model: ModelId; setModel: (m: ModelId) => void }>({
  model: 'sd21',
  setModel: () => {},
})
export const useModel = () => useContext(Ctx)

export function ModelProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<ModelId>('sd21')
  return <Ctx.Provider value={{ model, setModel }}>{children}</Ctx.Provider>
}

