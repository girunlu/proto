import { useState } from "react";
import { Section, ToolCard, ToolsGrid, SubsectionLabel, PlanNote, Lightbox } from "./ToolCard";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ─── Tool 07 — Distribution bars ────────────────────────────────────────────

const DEMO_PROMPTS = ["a doctor", "a CEO", "a nurse", "a professor", "a scientist"];
const DEMO_DATA: Record<string, { bare: number; contextual: number; override: number }> = {
  "a doctor":    { bare: 0.68, contextual: 0.91, override: 0.22 },
  "a CEO":       { bare: 0.82, contextual: 0.94, override: 0.18 },
  "a nurse":     { bare: 0.14, contextual: 0.08, override: 0.78 },
  "a professor": { bare: 0.72, contextual: 0.88, override: 0.31 },
  "a scientist": { bare: 0.75, contextual: 0.90, override: 0.28 },
};

function BarRow({ label, value, color, suffix }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-[#867f6f] w-[74px] text-right shrink-0" style={MONO}>
        {label}
      </span>
      <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
        <div
          className="h-full rounded-[3px] transition-all duration-500"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
      <span className="text-[9px] text-[#867f6f] w-[44px] shrink-0" style={MONO}>
        {suffix ?? `${Math.round(value * 100)}% ♂`}
      </span>
    </div>
  );
}

function DistributionBars() {
  const [selected, setSelected] = useState("a doctor");
  const d = DEMO_DATA[selected];
  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex flex-wrap gap-[5px]">
        {DEMO_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => setSelected(p)}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: selected === p ? "#4f46e5" : "#f5f4f0",
              color: selected === p ? "#fff" : "#666",
              borderColor: selected === p ? "#4f46e5" : "#e0ddd6",
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-[7px]">
        <BarRow label="bare" value={d.bare} color="#818cf8" />
        <BarRow label="contextual" value={d.contextual} color="#4f46e5" />
        <BarRow label="override" value={d.override} color="#a5b4fc" />
      </div>
      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={MONO}>
        each bar = share of 50 images whose face reads as <b>male</b> (FairFace) · bare = no
        context · contextual = professional setting added · override = explicit gender added
      </p>
    </div>
  );
}

// ─── Tool 06 — Image batch with hover labels ───────────────────────────────

const BATCH_SHADES = [
  "#d4c8c0","#c8c0b8","#d0c8c0","#c4bcb4","#d4c8c0","#c8beb6","#d0c0b8","#c8c0ba",
  "#c8c0ba","#d0c8c2","#c4bcb6","#d4c8c2","#c8c0ba","#d0c8c0","#c4beb8","#d0c8c0",
];

// placeholder per-image FairFace labels — deterministic, mostly male to mirror "a doctor"
const BATCH_LABELS = BATCH_SHADES.map((_, i) => ({
  gender: i % 6 === 4 ? "female-read" : "male-read",
  race: i % 5 === 3 ? "east asian" : "white",
}));

function ImageBatch() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="grid gap-[3px] h-[80px]" style={{ gridTemplateColumns: "repeat(8, 1fr)" }}>
        {BATCH_SHADES.map((s, i) => (
          <div
            key={i}
            className="rounded-[2px] cursor-pointer transition-all duration-100"
            style={{
              background: s,
              outline: hovered === i ? "2px solid #818cf8" : "none",
              outlineOffset: "1px",
              opacity: hovered !== null && hovered !== i ? 0.55 : 1,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <p className="text-[9px] h-[14px]" style={{ ...MONO, color: hovered !== null ? "#4f46e5" : "#a39d8e" }}>
        {hovered !== null
          ? `seed ${String(hovered).padStart(2, "0")} — FairFace: ${BATCH_LABELS[hovered].gender} · ${BATCH_LABELS[hovered].race}`
          : "hover a thumbnail to see its per-image FairFace label"}
      </p>
    </div>
  );
}

// ─── Tool 08 — Amplification delta (moved here from Layer 4) ───────────────

function AmplificationDelta() {
  const rows = [
    { label: "bare", pct: 0.65, color: "#fbbf24", delta: "reference" },
    { label: "contextual", pct: 0.91, color: "#f59e0b", delta: "+26 pp" },
    { label: "override", pct: 0.22, color: "#fcd34d", delta: "−43 pp" },
  ];
  return (
    <div className="p-3 flex flex-col gap-[10px] justify-center">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="text-[9px] text-[#867f6f] w-[70px] text-right shrink-0" style={MONO}>
            {r.label}
          </span>
          <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
            <div className="h-full rounded-[3px]" style={{ width: `${r.pct * 100}%`, background: r.color }} />
          </div>
          <span className="text-[9px] text-[#867f6f] w-[44px] shrink-0" style={MONO}>
            {Math.round(r.pct * 100)}% ♂
          </span>
          <span
            className="text-[9px] w-[64px] shrink-0 font-semibold"
            style={{ ...MONO, color: r.delta === "reference" ? "#a39d8e" : r.delta.startsWith("+") ? "#ef4444" : "#16a34a" }}
          >
            {r.delta}
          </span>
        </div>
      ))}
      <p className="text-[9px] text-[#8a8374] pl-[78px]" style={MONO}>
        both deltas vs. the same bare prompt — context amplifies the default for free; undoing it
        costs an explicit override
      </p>
    </div>
  );
}

// ─── Tool 09 — Cultural grid (real images, SD 2.1 CFG=7 seed_00) ────────────

const CULTURAL_SITUATIONS = [
  { id: "wedding",   label: "a wedding" },
  { id: "breakfast", label: "a breakfast" },
  { id: "funeral",   label: "a funeral" },
];
const CULTURAL_LOCATIONS = [
  { id: "default", label: "default" },
  { id: "nigeria", label: "in Nigeria" },
  { id: "japan",   label: "in Japan" },
];

const N_SEEDS = 3;

interface CulturalGridProps {
  sitId: string;
  setSitId: (s: string) => void;
  seedIdx: number;
  setSeedIdx: (n: number) => void;
}

function CulturalGrid({ sitId, setSitId, seedIdx, setSeedIdx }: CulturalGridProps) {
  const seedStr = String(seedIdx).padStart(2, "0");

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Situation chips */}
      <div className="flex gap-[5px] flex-wrap">
        {CULTURAL_SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSitId(s.id)}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: sitId === s.id ? "#064e3b" : "#f5f4f0",
              color: sitId === s.id ? "#d1fae5" : "#666",
              borderColor: sitId === s.id ? "#064e3b" : "#e0ddd6",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Image grid */}
      <div className="flex gap-[6px]">
        {CULTURAL_LOCATIONS.map((loc) => {
          const src = `/images/cultural/${sitId}_${loc.id}_seed${seedStr}.png`;
          return (
            <div key={loc.id} className="flex-1 flex flex-col gap-[4px]">
              <span
                className="text-[9px] text-[#555] text-center font-semibold bg-[#f0ede6] rounded-[3px] py-[2px]"
                style={MONO}
              >
                {loc.label}
              </span>
              <Lightbox src={src} alt={`${sitId} ${loc.label} sample ${seedIdx + 1}`}>
                <img
                  src={src}
                  alt={`${sitId} ${loc.label}`}
                  className="w-full rounded-[4px] object-cover"
                  style={{ aspectRatio: "1 / 1" }}
                />
              </Lightbox>
            </div>
          );
        })}
      </div>

      {/* Seed cycler */}
      <div className="flex items-center justify-between">
        <p className="text-[8px] text-[#a39d8e]" style={MONO}>
          SD 2.1 · CFG 7.5 · 768×768 · click to zoom
        </p>
        <div className="flex items-center gap-[6px]">
          <button
            onClick={() => setSeedIdx(Math.max(0, seedIdx - 1))}
            disabled={seedIdx === 0}
            className="text-[10px] px-[7px] py-[2px] rounded-[3px] border transition-colors disabled:opacity-30"
            style={{ ...MONO, background: "#f5f4f0", borderColor: "#e0ddd6" }}
          >
            ←
          </button>
          <span className="text-[9px] text-[#867f6f]" style={MONO}>
            sample {seedIdx + 1}/{N_SEEDS}
          </span>
          <button
            onClick={() => setSeedIdx(Math.min(N_SEEDS - 1, seedIdx + 1))}
            disabled={seedIdx === N_SEEDS - 1}
            className="text-[10px] px-[7px] py-[2px] rounded-[3px] border transition-colors disabled:opacity-30"
            style={{ ...MONO, background: "#f5f4f0", borderColor: "#e0ddd6" }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tool 10 — Embedding distance bars (real DINOv2 data) ───────────────────
// Source: src/materials/analysis/cultural/distances.json
// Method: cosine distance between L2-normalised mean DINOv2 embeddings,
//         n=50 seeds per variant, 10k bootstrap CIs (percentile method)

const CULTURAL_DISTANCES: Record<string, { country: string; dist: number; ci_low: number; ci_high: number }[]> = {
  wedding: [
    { country: "India",     dist: 0.807, ci_low: 0.778, ci_high: 0.840 },
    { country: "Nigeria",   dist: 0.698, ci_low: 0.658, ci_high: 0.750 },
    { country: "Japan",     dist: 0.660, ci_low: 0.613, ci_high: 0.713 },
    { country: "Egypt",     dist: 0.634, ci_low: 0.577, ci_high: 0.707 },
    { country: "Indonesia", dist: 0.443, ci_low: 0.397, ci_high: 0.516 },
    { country: "Russia",    dist: 0.202, ci_low: 0.166, ci_high: 0.296 },
    { country: "Germany",   dist: 0.184, ci_low: 0.154, ci_high: 0.257 },
    { country: "USA",       dist: 0.105, ci_low: 0.096, ci_high: 0.167 },
  ],
  breakfast: [
    { country: "Japan",     dist: 0.696, ci_low: 0.660, ci_high: 0.737 },
    { country: "India",     dist: 0.631, ci_low: 0.600, ci_high: 0.674 },
    { country: "Indonesia", dist: 0.501, ci_low: 0.459, ci_high: 0.559 },
    { country: "Nigeria",   dist: 0.498, ci_low: 0.467, ci_high: 0.548 },
    { country: "Egypt",     dist: 0.386, ci_low: 0.355, ci_high: 0.450 },
    { country: "USA",       dist: 0.322, ci_low: 0.278, ci_high: 0.386 },
    { country: "Russia",    dist: 0.287, ci_low: 0.256, ci_high: 0.347 },
    { country: "Germany",   dist: 0.279, ci_low: 0.246, ci_high: 0.341 },
  ],
  funeral: [
    { country: "Nigeria",   dist: 0.620, ci_low: 0.545, ci_high: 0.703 },
    { country: "India",     dist: 0.502, ci_low: 0.451, ci_high: 0.572 },
    { country: "Egypt",     dist: 0.357, ci_low: 0.299, ci_high: 0.448 },
    { country: "Indonesia", dist: 0.315, ci_low: 0.285, ci_high: 0.371 },
    { country: "Japan",     dist: 0.254, ci_low: 0.210, ci_high: 0.339 },
    { country: "Germany",   dist: 0.153, ci_low: 0.121, ci_high: 0.232 },
    { country: "Russia",    dist: 0.127, ci_low: 0.115, ci_high: 0.175 },
    { country: "USA",       dist: 0.094, ci_low: 0.075, ci_high: 0.169 },
  ],
};

function EmbeddingDistanceBars({ sitId, setSitId }: { sitId: string; setSitId: (s: string) => void }) {
  const rows = CULTURAL_DISTANCES[sitId] ?? [];
  const maxDist = Math.max(...rows.map((r) => r.dist));

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex gap-[5px] flex-wrap">
        {CULTURAL_SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSitId(s.id)}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: sitId === s.id ? "#064e3b" : "#f5f4f0",
              color: sitId === s.id ? "#d1fae5" : "#666",
              borderColor: sitId === s.id ? "#064e3b" : "#e0ddd6",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-[7px] mt-1">
        {rows.map((d) => {
          const pct = d.dist / maxDist;
          const ciLoPct = d.ci_low / maxDist;
          const ciHiPct = d.ci_high / maxDist;
          return (
            <div key={d.country} className="flex items-center gap-2">
              <span className="text-[9px] text-[#867f6f] w-[58px] text-right shrink-0" style={MONO}>
                {d.country}
              </span>
              <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-visible relative">
                {/* CI band */}
                <div
                  className="absolute top-0 h-full rounded-[3px] opacity-30"
                  style={{ left: `${ciLoPct * 100}%`, width: `${(ciHiPct - ciLoPct) * 100}%`, background: "#059669" }}
                />
                {/* Mean bar */}
                <div
                  className="absolute top-0 h-full rounded-[3px]"
                  style={{ width: `${pct * 100}%`, background: "#34d399" }}
                />
              </div>
              <span className="text-[9px] text-[#867f6f] w-[28px]" style={MONO}>
                {d.dist.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-[#a39d8e] mt-1" style={MONO}>
        DINOv2 ViT-B/14 · n=50 seeds · bars = mean, shading = 95% CI
      </p>
    </div>
  );
}

// ─── Tool 10b — Intraset similarity (stereotyping finding) ──────────────────
// Source: src/materials/analysis/cultural/intraset_sim.json
// Finding: country-qualified prompts produce more homogeneous (more stereotyped)
// output than the unqualified default — the model narrows its concept of a culture.

const CULTURAL_INTRASET: Record<string, { label: string; sim: number; isDefault: boolean }[]> = {
  wedding: [
    { label: "default",   sim: 0.444, isDefault: true  },
    { label: "Russia",    sim: 0.368, isDefault: false },
    { label: "USA",       sim: 0.418, isDefault: false },
    { label: "Egypt",     sim: 0.398, isDefault: false },
    { label: "Indonesia", sim: 0.435, isDefault: false },
    { label: "Germany",   sim: 0.440, isDefault: false },
    { label: "India",     sim: 0.632, isDefault: false },
    { label: "Japan",     sim: 0.670, isDefault: false },
    { label: "Nigeria",   sim: 0.687, isDefault: false },
  ],
  breakfast: [
    { label: "Egypt",     sim: 0.415, isDefault: false },
    { label: "Nigeria",   sim: 0.483, isDefault: false },
    { label: "default",   sim: 0.491, isDefault: true  },
    { label: "Germany",   sim: 0.527, isDefault: false },
    { label: "Russia",    sim: 0.562, isDefault: false },
    { label: "India",     sim: 0.572, isDefault: false },
    { label: "Indonesia", sim: 0.596, isDefault: false },
    { label: "USA",       sim: 0.648, isDefault: false },
    { label: "Japan",     sim: 0.738, isDefault: false },
  ],
  funeral: [
    { label: "USA",       sim: 0.421, isDefault: false },
    { label: "default",   sim: 0.474, isDefault: true  },
    { label: "Japan",     sim: 0.481, isDefault: false },
    { label: "Egypt",     sim: 0.507, isDefault: false },
    { label: "Germany",   sim: 0.508, isDefault: false },
    { label: "Indonesia", sim: 0.522, isDefault: false },
    { label: "Russia",    sim: 0.530, isDefault: false },
    { label: "Nigeria",   sim: 0.577, isDefault: false },
    { label: "India",     sim: 0.605, isDefault: false },
  ],
};

function IntrasetBars({ sitId, setSitId }: { sitId: string; setSitId: (s: string) => void }) {
  const rows = CULTURAL_INTRASET[sitId] ?? [];

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex gap-[5px] flex-wrap">
        {CULTURAL_SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSitId(s.id)}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: sitId === s.id ? "#4f46e5" : "#f5f4f0",
              color: sitId === s.id ? "#e0e7ff" : "#666",
              borderColor: sitId === s.id ? "#4f46e5" : "#e0ddd6",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-[7px] mt-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span
              className="text-[9px] w-[58px] text-right shrink-0"
              style={{ ...MONO, color: r.isDefault ? "#4f46e5" : "#867f6f", fontWeight: r.isDefault ? 700 : 400 }}
            >
              {r.label}
            </span>
            <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
              <div
                className="h-full rounded-[3px]"
                style={{
                  width: `${r.sim * 100}%`,
                  background: r.isDefault ? "#818cf8" : r.sim > 0.65 ? "#ef4444" : r.sim > 0.5 ? "#f59e0b" : "#34d399",
                }}
              />
            </div>
            <span className="text-[9px] text-[#867f6f] w-[28px]" style={MONO}>
              {r.sim.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[8px] text-[#a39d8e] mt-1 leading-[1.4]" style={MONO}>
        Higher = more uniform output (more stereotyped). Red = high stereotyping.
        <br />
        DINOv2 mean pairwise cosine sim · n=50 seeds · sorted low→high
      </p>
    </div>
  );
}

// ─── Tool 11 — DAAM overlay ─────────────────────────────────────────────────

const DAAM_TOKENS = ["a", "red", "cube", "next", "to", "a", "blue", "sphere"];

const DAAM_MAPS: Record<string, { rgb: string; note: string; gradient: string }> = {
  red: {
    rgb: "239,68,68",
    note: '"red" leaks onto the sphere too — attribute not bound to the cube',
    gradient: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.70) 38%, rgba(239,68,68,0.55) 80%, rgba(239,68,68,0.1) 100%)",
  },
  cube: {
    rgb: "245,158,11",
    note: '"cube" attends mostly to the left object — shape binding mostly works',
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.65) 0%, rgba(245,158,11,0.5) 35%, rgba(245,158,11,0.06) 70%)",
  },
  blue: {
    rgb: "59,130,246",
    note: '"blue" splits across both objects — this is the bleed that recolors the cube',
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0.08) 55%, rgba(59,130,246,0.6) 100%)",
  },
  sphere: {
    rgb: "16,185,129",
    note: '"sphere" is localized right — but inherits whatever color won the fight',
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.12) 45%, rgba(16,185,129,0.6) 100%)",
  },
};

function DAAMOverlay() {
  const [token, setToken] = useState("red");
  const map = DAAM_MAPS[token];

  return (
    <div className="p-3 flex flex-col gap-2">
      {/* Word-by-word prompt — content tokens clickable */}
      <div className="flex flex-wrap gap-[4px] items-center">
        <span className="text-[9px] text-[#8a8374] mr-1" style={MONO}>
          prompt:
        </span>
        {DAAM_TOKENS.map((w, i) => {
          const clickable = w in DAAM_MAPS;
          const active = clickable && token === w;
          return (
            <button
              key={i}
              onClick={() => clickable && setToken(w)}
              disabled={!clickable}
              className="text-[10px] px-[7px] py-[2px] rounded-[3px] border transition-all"
              style={{
                ...MONO,
                background: active ? `rgb(${map.rgb})` : clickable ? "#f0ede6" : "transparent",
                color: active ? "#fff" : clickable ? "#555" : "#8a8374",
                borderColor: active ? `rgb(${map.rgb})` : clickable ? "#e0ddd6" : "transparent",
                cursor: clickable ? "pointer" : "default",
              }}
            >
              {w}
            </button>
          );
        })}
      </div>

      <div className="flex gap-[8px] h-[120px]">
        <div className="flex-1 rounded-[5px] bg-[#d0c8c0] relative">
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#867f6f]" style={MONO}>
            generated image
          </span>
        </div>
        <div
          className="flex-1 rounded-[5px] border border-dashed border-[#f0ede6] relative transition-all duration-300"
          style={{ background: map.gradient }}
        >
          <span
            className="absolute bottom-[5px] left-0 right-0 text-center text-[8px]"
            style={{ color: `rgba(${map.rgb},0.95)`, ...MONO }}
          >
            heatmap: "{token}"
          </span>
        </div>
      </div>
      <p className="text-[9px] text-center transition-colors" style={{ ...MONO, color: `rgba(${map.rgb},0.85)` }}>
        {map.note}
      </p>
    </div>
  );
}

// ─── Tool 12a — Directional fidelity ────────────────────────────────────────

const FIDELITY = [
  {
    label: '"a white male doctor"',
    grain: "with the grain",
    shade: "#c6cdd6",
    metrics: [
      { name: "requested attributes present", value: 0.96, good: true },
      { name: "off-prompt errors (VQA)", value: 0.06, good: false },
      { name: "face detection failures", value: 0.02, good: false },
    ],
  },
  {
    label: '"a Nigerian female doctor"',
    grain: "against the grain",
    shade: "#cdc2b2",
    metrics: [
      { name: "requested attributes present", value: 0.71, good: true },
      { name: "off-prompt errors (VQA)", value: 0.22, good: false },
      { name: "face detection failures", value: 0.09, good: false },
    ],
  },
];

function DirectionalFidelity() {
  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex gap-4">
        {FIDELITY.map((side) => (
          <div key={side.label} className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#1a1a1a] font-medium" style={MONO}>
                {side.label}
              </span>
              <span
                className="text-[8px] px-[6px] py-[1px] rounded-[3px]"
                style={{
                  ...MONO,
                  background: side.grain === "with the grain" ? "#dcfce7" : "#fee2e2",
                  color: side.grain === "with the grain" ? "#166534" : "#991b1b",
                }}
              >
                {side.grain}
              </span>
            </div>
            <div className="h-[64px] rounded-[5px]" style={{ background: side.shade }} />
            <div className="flex flex-col gap-[5px]">
              {side.metrics.map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="text-[8px] text-[#867f6f] w-[150px] shrink-0 text-right" style={MONO}>
                    {m.name}
                  </span>
                  <div className="flex-1 h-[9px] bg-[#f0ede6] rounded-[2px] overflow-hidden">
                    <div
                      className="h-full rounded-[2px]"
                      style={{
                        width: `${m.value * 100}%`,
                        background: m.good ? "#34d399" : "#f87171",
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-[#867f6f] w-[30px] shrink-0" style={MONO}>
                    {Math.round(m.value * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-[#8a8374] text-center leading-[1.5]" style={MONO}>
        identical sentence structure, n=50 each, full 2×2 grid (race × gender) so the direction
        effect decomposes · green = should be high · red = should be low
      </p>
    </div>
  );
}

// ─── Tool 12b — Attention swap pair ─────────────────────────────────────────

function AttentionSwapPair() {
  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex gap-3 items-center h-[130px]">
        <div className="flex-1 rounded-[5px] bg-[#d0c8c0] relative h-full">
          <div className="absolute top-[6px] left-[6px] text-[8px] text-[#888] bg-white/80 px-[5px] py-[1px] rounded" style={MONO}>
            original failure
          </div>
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#867f6f]" style={MONO}>
            before attention swap
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[#a39d8e]">
          <span className="text-[18px] select-none">→</span>
          <span className="text-[8px] text-[#8a8374]" style={MONO}>P2P swap</span>
        </div>
        <div className="flex-1 rounded-[5px] bg-[#c0d0bc] relative h-full">
          <div className="absolute top-[6px] left-[6px] text-[8px] text-[#888] bg-white/80 px-[5px] py-[1px] rounded" style={MONO}>
            corrected output
          </div>
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#867f6f]" style={MONO}>
            after attention swap
          </span>
        </div>
      </div>
      <p className="text-[9px] text-[#8a8374] text-center" style={MONO}>
        only the cross-attention maps are swapped — spatial layout and identity preserved
      </p>
    </div>
  );
}

export function Layer3() {
  // Shared state for all three cultural tools — changing situation in any chip updates all three
  const [culturalSit, setCulturalSit] = useState("wedding");
  const [culturalSeed, setCulturalSeed] = useState(0);

  return (
    <Section
      id="l3"
      badge={{ label: "Layer 3", variant: "l3a" }}
      title="The defaults — what the assumptions look like"
      question="What does SD assume when you leave attributes unspecified?"
      explanation="Once we know that assumptions are structurally possible (Layer 1) and that a prior exists to fill that space (Layer 2), we can ask what that prior actually contains. This layer presents three categories of default: demographic assumptions about who a person is, cultural assumptions about what everyday scenes look like, and compositional failures where attributes leak between objects through cross-attention."
    >
      <PlanNote
        purpose="Show what the defaults contain: who the doctor is, whose wedding 'a wedding' is, where adjectives actually land."
        computed="50 images per prompt → FairFace distributions + bootstrap CIs; amplification delta = contextual − bare; cultural distance via DINOv2; DAAM heatmaps + attention swap."
        useful="Every claim is backed by a visible batch — the viewer can check the statistics against the images."
        interaction="Chips switch prompts; hover thumbnails for per-image labels; click DAAM tokens to switch overlays."
      />

      <SubsectionLabel
        explanation="When a prompt names a profession or social role without specifying demographics, SD fills in gender and race from its training distribution. These defaults are not random — they reflect and amplify the statistical biases of internet-scale image datasets. Adding professional context (e.g. 'in a hospital') typically makes the skew stronger, not weaker."
      >
        3a — Demographic defaults
      </SubsectionLabel>
      <ToolsGrid cols={2}>
        <ToolCard
          num="06"
          name="Image batch — 50 images per prompt"
          type="Interactive grid"
          description="50 images at fixed seeds, DDIM, SD 2.1 — the raw distribution the FairFace classifier runs on. Hover any thumbnail for its per-image label."
          explanation="Generating 50 images per prompt at deterministic seeds produces a distribution that can be statistically characterized. Individual images may vary, but the aggregate reveals the model's systematic tendencies. Hovering grounds every aggregate number in a concrete image — the viewer can verify the classifier's reading against their own."
        >
          <ImageBatch />
        </ToolCard>

        <ToolCard
          num="07"
          name="Gender distribution — bare / contextual / override"
          type="Interactive chart"
          description="FairFace gender-read percentages for each prompt variant, with bootstrap CIs in the final version."
          explanation="Select a prompt to see how its gender distribution shifts across three conditions. 'Bare' uses the occupation term alone. 'Contextual' adds a professional setting. 'Override' adds an explicit gender term. The gap between bare and contextual reveals how social context amplifies rather than suppresses the model's defaults."
        >
          <DistributionBars />
        </ToolCard>

        <ToolCard
          num="08"
          name="Amplification vs. override — two deltas, one prompt"
          type="Derived metric"
          description="Both variants measured against the same bare prompt: realistic context pushes the skew up (+26 pp); an explicit gender term is needed to push it down (−43 pp)."
          explanation="The bare prompt is the reference, so its own delta is zero — the comparison that matters is what each modification does to it. Adding realistic context amplifies the default without any demographic word. Undoing the default requires naming it explicitly. The asymmetry is the finding: bias comes free, correction costs intent."
        >
          <AmplificationDelta />
        </ToolCard>
      </ToolsGrid>

      <SubsectionLabel
        explanation="Cultural defaults are harder to see than demographic ones because they often feel like neutral design choices — a particular kitchen layout, a particular wedding dress style. But these choices encode a specific cultural vantage point that becomes visible as soon as you add geographic context to the same prompt."
      >
        3b — Cultural defaults
      </SubsectionLabel>
      <ToolsGrid cols={2}>
        <ToolCard
          num="09"
          name="Side-by-side cultural image grids"
          type="Interactive grid"
          description="Same concept in default / Nigeria / Japan — select a situation to compare how SD's visual vocabulary shifts across geographic contexts. Real generated images, SD 2.1."
          explanation="The default outputs reveal SD's implicit cultural baseline. Adding 'in Nigeria' or 'in Japan' produces dramatically different compositions, colour palettes, and material cultures. The unqualified prompt is indistinguishable from a Western framing — not because the model lacks other cultural knowledge, but because it treats one perspective as the unmarked default."
        >
          <CulturalGrid sitId={culturalSit} setSitId={setCulturalSit} seedIdx={culturalSeed} setSeedIdx={setCulturalSeed} />
        </ToolCard>

        <ToolCard
          num="10"
          name="Distance from the default"
          type="Bar chart"
          description="DINOv2 cosine distance between the mean embedding of the unqualified prompt and each country-qualified variant. n=50 seeds, 95% bootstrap CI. Select a situation."
          explanation="Small distance means that adding a geographic qualifier changes almost nothing — that geography is already the model's default. Large distance measures how far SD must travel to represent that culture. DINOv2 is used instead of CLIP to avoid measuring CLIP's own bias with CLIP."
        >
          <EmbeddingDistanceBars sitId={culturalSit} setSitId={setCulturalSit} />
        </ToolCard>

        <ToolCard
          num="10b"
          name="Output diversity — default vs country-qualified"
          type="Bar chart"
          description="Mean pairwise DINOv2 cosine similarity within each variant's 50-image batch. Higher = more uniform / more stereotyped. Select a situation."
          explanation="A surprising finding: country-qualified prompts produce more homogeneous output than the unqualified default. 'A wedding in Nigeria' generates near-identical images across seeds (high similarity), while 'a wedding' generates diverse ones. The model has a narrow, stereotyped concept of each non-Western culture — and a richer, more varied concept of its own default."
          fullWidth
        >
          <IntrasetBars sitId={culturalSit} setSitId={setCulturalSit} />
        </ToolCard>
      </ToolsGrid>

      <SubsectionLabel
        explanation="Compositional failures occur when attributes specified for one object bleed into another through the cross-attention mechanism. This is a lower-level failure than demographic bias — not about who the model imagines people to be, but about how it binds adjectives to nouns during denoising."
      >
        3c — Compositional failures
      </SubsectionLabel>
      <ToolsGrid cols={2}>
        <ToolCard
          num="11"
          name="DAAM cross-attention heatmap overlays"
          type="Interactive overlay"
          description="Per-token pixel attribution aggregated across all U-Net layers and timesteps — click a token to see which pixels it actually controlled."
          explanation="DAAM integrates cross-attention maps across all timesteps and U-Net layers into a per-token saliency map. When attribute binding fails, the heatmap for a color token spreads over the wrong object. The visualization makes the failure mechanistically transparent: the model has the right information but routes it incorrectly."
        >
          <DAAMOverlay />
        </ToolCard>

        <ToolCard
          num="12a"
          name="Directional fidelity — the model works better with the grain"
          type="Comparison"
          description="Same sentence structure, opposite assumption directions: 'a white male doctor' vs 'a Nigerian female doctor'. Error rates rise when the prompt fights the default."
          explanation="Fidelity is measured, not judged: how often the requested attributes actually appear (FairFace), how often off-prompt errors occur (VQA + object detection), how often face detection fails. Against-the-grain prompts pay an error tax — the model doesn't refuse, it just quietly does worse. Aesthetic scores drop too, which is expected by construction: the aesthetic filter is part of the worldview being fought."
          fullWidth
        >
          <DirectionalFidelity />
        </ToolCard>

        <ToolCard
          num="12b"
          name="Causal attribution — attention swap pair"
          type="Image pair"
          description="Original compositional failure alongside the corrected output after forcing cross-attention maps to swap mid-generation via Prompt-to-Prompt — proves attention routing is the causal mechanism."
          explanation="Swapping only the cross-attention maps — while keeping noise, timestep schedule, and weights constant — is sufficient to correct the failure. This rules out confounds in the denoising trajectory: the attention map is not just correlated with the failure; it causes it."
        >
          <AttentionSwapPair />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
