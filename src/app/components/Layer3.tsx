import { useState } from "react";
import { Section, ToolCard, ToolsGrid, SubsectionLabel, PlanNote, Lightbox, PredictionReveal } from "./ToolCard";
import distancesData from "../../data/cultural/distances.json";
import intrasetData from "../../data/cultural/intraset_sim.json";
import pairwiseData from "../../data/cultural/pairwise_distance.json";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ─── Shared cultural country/event vocab (real data: 6 events x 9 variants) ─
// Source: src/materials/analysis/cultural/{distances,intraset_sim}.json (DINOv2, n=50, cfg=7)

type CountryEntry = { id: string; code: string; label: string };
const COUNTRIES: CountryEntry[] = [
  { id: "usa",       code: "US", label: "USA" },
  { id: "germany",   code: "DE", label: "Germany" },
  { id: "russia",    code: "RU", label: "Russia" },
  { id: "india",     code: "IN", label: "India" },
  { id: "indonesia", code: "ID", label: "Indonesia" },
  { id: "japan",     code: "JP", label: "Japan" },
  { id: "egypt",     code: "EG", label: "Egypt" },
  { id: "nigeria",   code: "NG", label: "Nigeria" },
];
const COUNTRY_BY_CODE: Record<string, CountryEntry> = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

type DistancesJson = { results: Record<string, Record<string, { mean: number; ci_low: number; ci_high: number }>> };
type IntrasetJson = { results: Record<string, Record<string, { mean: number; ci_low: number; ci_high: number }>> };
const DISTANCES = (distancesData as DistancesJson).results;
const INTRASET = (intrasetData as IntrasetJson).results;

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

// ─── Tool 09 — Cultural grid (real images, SD 2.1 CFG=7, seeds 00-02) ───────
// All 6 events x 9 variants (default + 8 countries) have real exported images.

const CULTURAL_SITUATIONS = [
  { id: "breakfast",   label: "a breakfast" },
  { id: "celebration", label: "a celebration" },
  { id: "family",      label: "a family" },
  { id: "funeral",     label: "a funeral" },
  { id: "school",      label: "a school" },
  { id: "wedding",     label: "a wedding" },
];

const CULTURAL_SEEDS = [
  { suffix: "",    label: "seed 00" },
  { suffix: "_01", label: "seed 01" },
  { suffix: "_02", label: "seed 02" },
];

function CulturalGrid({ sitId, onZoom }: { sitId: string; onZoom: (src: string) => void }) {
  const [seedIdx, setSeedIdx] = useState(0);
  const [compareA, setCompareA] = useState("nigeria");
  const [compareB, setCompareB] = useState("japan");
  const seed = CULTURAL_SEEDS[seedIdx];

  // key = fixed column role, id = country currently shown there — kept separate so
  // picking the same country in both selects (or matching "default") can't collide
  // React keys and leave a stale image node behind.
  const columns = [
    { key: "default", id: "default", label: "default" },
    { key: "compareA", id: compareA, label: countryById(compareA)?.label ?? compareA },
    { key: "compareB", id: compareB, label: countryById(compareB)?.label ?? compareB },
  ];

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Compare-country selectors — default is always the reference column */}
      <div className="flex gap-[10px] items-center flex-wrap">
        <span className="text-[9px] text-[#8a8374]" style={MONO}>compare:</span>
        <select
          value={compareA}
          onChange={(e) => setCompareA(e.target.value)}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={MONO}
        >
          {COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <span className="text-[9px] text-[#a39d8e]" style={MONO}>vs</span>
        <select
          value={compareB}
          onChange={(e) => setCompareB(e.target.value)}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={MONO}
        >
          {COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="flex gap-[6px]">
        {columns.map((col) => {
          const src = `/images/cultural/${sitId}_${col.id}${seed.suffix}.webp`;
          return (
            <div key={col.key} className="flex-1 flex flex-col gap-[4px]">
              <span className="text-[9px] text-[#555] text-center font-semibold bg-[#f0ede6] rounded-[3px] py-[2px]" style={MONO}>
                {col.label}
              </span>
              <img
                src={src}
                alt={`${sitId} ${col.label}`}
                loading="lazy"
                className="w-full rounded-[4px] object-cover hover:opacity-90 transition-opacity"
                style={{ aspectRatio: "1 / 1", cursor: "zoom-in" }}
                onClick={() => onZoom(src)}
              />
            </div>
          );
        })}
      </div>
      {/* Seed navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSeedIdx(Math.max(0, seedIdx - 1))}
          disabled={seedIdx === 0}
          className="text-[10px] px-[8px] py-[2px] rounded-[3px] border transition-colors disabled:opacity-30"
          style={{ ...MONO, borderColor: "#d0cdc6", color: "#555" }}
        >←</button>
        <span className="text-[9px] text-[#867f6f] flex-1 text-center" style={MONO}>
          {seed.label} / {CULTURAL_SEEDS.length - 1}  — drag to verify pattern holds across seeds
        </span>
        <button
          onClick={() => setSeedIdx(Math.min(CULTURAL_SEEDS.length - 1, seedIdx + 1))}
          disabled={seedIdx === CULTURAL_SEEDS.length - 1}
          className="text-[10px] px-[8px] py-[2px] rounded-[3px] border transition-colors disabled:opacity-30"
          style={{ ...MONO, borderColor: "#d0cdc6", color: "#555" }}
        >→</button>
      </div>
      <p className="text-[8px] text-[#a39d8e]" style={MONO}>
        SD 2.1 · DDIM · CFG 7 · click any image to enlarge
      </p>
    </div>
  );
}

function countryById(id: string): CountryEntry | undefined {
  return COUNTRIES.find(c => c.id === id);
}

// ─── Tool 10 — Embedding distance bars (real DINOv2 data) ───────────────────
// Source: src/materials/analysis/cultural/distances.json
// Method: cosine distance between L2-normalised mean DINOv2 embeddings,
//         n=50 seeds per variant, 10k bootstrap CIs (percentile method)

// Fixed WEIRD-gradient row order (COUNTRIES) and a fixed global max across every
// situation, so the chart's scale and row order never shift when switching
// situations — only the bar lengths change, which is the thing worth comparing.
const GLOBAL_MAX_DIST = Math.max(
  ...Object.values(DISTANCES).flatMap((bySit) => Object.values(bySit).map((v) => v.mean)),
);

function distanceRows(sitId: string) {
  const bySit = DISTANCES[sitId] ?? {};
  return COUNTRIES
    .map((c) => bySit[c.code] && { country: c.label, dist: bySit[c.code].mean, ci_low: bySit[c.code].ci_low, ci_high: bySit[c.code].ci_high })
    .filter((r): r is { country: string; dist: number; ci_low: number; ci_high: number } => !!r);
}

function EmbeddingDistanceBars({ sitId }: { sitId: string }) {
  const rows = distanceRows(sitId);
  const maxDist = GLOBAL_MAX_DIST;

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex flex-col gap-[7px] mt-1">
        {rows.map((d) => {
          const pct = d.dist / maxDist;
          return (
            <div key={d.country} className="flex items-center gap-2">
              <span className="text-[9px] text-[#867f6f] w-[58px] text-right shrink-0" style={MONO}>
                {d.country}
              </span>
              <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
                <div className="h-full rounded-[3px]" style={{ width: `${pct * 100}%`, background: "#34d399" }} />
              </div>
              <span className="text-[9px] text-[#867f6f] w-[28px]" style={MONO}>
                {d.dist.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-[#a39d8e] mt-1" style={MONO}>
        DINOv2 ViT-B/14 · n=50 seeds · mean values · fixed row order + scale across situations —
        only bar length changes when you switch
      </p>
    </div>
  );
}

// ─── Tool 10b — Intraset similarity (stereotyping finding) ──────────────────
// Source: src/materials/analysis/cultural/intraset_sim.json
// Finding: country-qualified prompts produce more homogeneous (more stereotyped)
// output than the unqualified default — the model narrows its concept of a culture.

function IntrasetBars({ sitId }: { sitId: string }) {
  const bySit = INTRASET[sitId] ?? {};
  const defaultSim = bySit["default"]?.mean ?? 0;
  // compute relative change vs default, sort descending
  const rows = Object.entries(bySit)
    .filter(([code]) => code !== "default")
    .map(([code, v]) => ({ label: COUNTRY_BY_CODE[code]?.label ?? code, sim: v.mean, rate: (v.mean - defaultSim) / defaultSim }))
    .sort((a, b) => b.rate - a.rate);

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.rate)), 0.01);

  const barColor = (rate: number) => {
    if (rate > 0.35) return "#ef4444";
    if (rate > 0.10) return "#f59e0b";
    if (rate > -0.05) return "#94a3b8";
    return "#34d399";
  };

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-[#555] leading-[1.5]">
        Relative change in output diversity vs the unqualified default.
        <b style={{ color: "#ef4444" }}> Positive = more stereotyped</b> than
        "{CULTURAL_SITUATIONS.find(s => s.id === sitId)?.label}".
        <b style={{ color: "#34d399" }}> Negative = more diverse</b>.
      </p>
      <div className="flex flex-col gap-[6px]">
        {rows.map((r) => {
          const pct = Math.abs(r.rate) / maxAbs;
          const isPos = r.rate >= 0;
          return (
            <div key={r.label} className="flex items-center gap-2">
              <span className="text-[9px] text-[#867f6f] w-[58px] text-right shrink-0" style={MONO}>
                {r.label}
              </span>
              <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-hidden relative">
                {/* zero line at midpoint */}
                <div className="absolute top-0 bottom-0 w-[1px] bg-[#c4bfb8]" style={{ left: "0%" }} />
                <div
                  className="absolute top-[1px] bottom-[1px] rounded-[2px]"
                  style={{
                    left: isPos ? "0%" : `${(1 - pct) * 100}%`,
                    width: `${pct * 100}%`,
                    background: barColor(r.rate),
                  }}
                />
              </div>
              <span className="text-[9px] w-[38px] text-right shrink-0"
                style={{ ...MONO, color: barColor(r.rate) }}>
                {r.rate >= 0 ? "+" : ""}{(r.rate * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-[#a39d8e] mt-1" style={MONO}>
        (country_sim − default_sim) / default_sim · DINOv2 mean pairwise cosine · n=50 seeds
      </p>
    </div>
  );
}

// ─── Tool 11 — DAAM overlay (real cultural heatmaps) ────────────────────────
// All 6 events x 9 variants have exported token heatmaps under public/images/daam/
// Format: {event}_{countryId}_{word}.webp — word = event name, or the country's
// first prompt-word ("United" for USA, since SD 2.1 tokenises "United States" in two).

const DAAM_EVENTS = CULTURAL_SITUATIONS; // { id, label: "a ___" }
// first prompt-word per country, as it appears in the DAAM token filename
const DAAM_COUNTRY_WORD: Record<string, string> = {
  usa: "United", germany: "Germany", russia: "Russia", india: "India",
  indonesia: "Indonesia", japan: "Japan", egypt: "Egypt", nigeria: "Nigeria",
};

const SITUATION_COLOR = "239,68,68";   // event token — red
const COUNTRY_COLOR = "16,185,129";    // country token — green

function DAAMOverlay({ onZoom }: { onZoom: (src: string) => void }) {
  const [eventId, setEventId] = useState("wedding");
  const [countryId, setCountryId] = useState("nigeria");
  const [tokenKind, setTokenKind] = useState<"event" | "country">("event");

  const countryWord = countryId === "default" ? null : DAAM_COUNTRY_WORD[countryId];
  const activeKind = tokenKind === "country" && countryWord ? "country" : "event";
  const token = activeKind === "country" ? countryWord! : eventId;
  const rgb = activeKind === "country" ? COUNTRY_COLOR : SITUATION_COLOR;

  const promptLabel = countryId === "default"
    ? `a ${eventId}`
    : `a ${eventId} in ${countryById(countryId)?.label ?? countryId}`;

  const imgSrc  = `/images/cultural/${eventId}_${countryId}.webp`;
  const daamSrc = `/images/daam/${eventId}_${countryId}_${token}.webp`;

  const notes: Record<string, string> = {
    event: `"${eventId}" activates the event/scene structure — shared across every country variant`,
    country: `"${countryWord}" pulls attention toward cultural markers: attire, colour, setting`,
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Event / country selectors */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-[9px] text-[#8a8374]" style={MONO}>a</span>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={MONO}
        >
          {DAAM_EVENTS.map((ev) => <option key={ev.id} value={ev.id}>{ev.id}</option>)}
        </select>
        <span className="text-[9px] text-[#8a8374]" style={MONO}>in</span>
        <select
          value={countryId}
          onChange={(e) => { setCountryId(e.target.value); setTokenKind("event"); }}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={MONO}
        >
          <option value="default">default</option>
          {COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* Tokenised prompt — clickable tokens */}
      <div className="flex flex-wrap gap-[4px] items-center">
        <span className="text-[9px] text-[#8a8374] mr-1" style={MONO}>tokens:</span>
        <button
          onClick={() => setTokenKind("event")}
          className="text-[11px] px-[8px] py-[3px] rounded-[4px] border transition-all"
          style={{
            ...MONO,
            background: activeKind === "event" ? `rgb(${SITUATION_COLOR})` : "#f0ede6",
            color: activeKind === "event" ? "#fff" : "#444",
            borderColor: activeKind === "event" ? `rgb(${SITUATION_COLOR})` : "#d0cdc6",
            fontWeight: 600,
          }}
        >
          {eventId}
        </button>
        {countryWord && (
          <button
            onClick={() => setTokenKind("country")}
            className="text-[11px] px-[8px] py-[3px] rounded-[4px] border transition-all"
            style={{
              ...MONO,
              background: activeKind === "country" ? `rgb(${COUNTRY_COLOR})` : "#f0ede6",
              color: activeKind === "country" ? "#fff" : "#444",
              borderColor: activeKind === "country" ? `rgb(${COUNTRY_COLOR})` : "#d0cdc6",
              fontWeight: 600,
            }}
          >
            {countryWord}
          </button>
        )}
      </div>

      {/* Generated image + DAAM heatmap side by side */}
      <div className="flex gap-[8px]">
        <div className="flex-1 flex flex-col gap-[4px]">
          <span className="text-[8px] text-[#8a8374] text-center" style={MONO}>generated image</span>
          <img
            src={imgSrc}
            alt={promptLabel}
            loading="lazy"
            className="w-full rounded-[5px] object-cover hover:opacity-90 transition-opacity"
            style={{ aspectRatio: "1/1", cursor: "zoom-in" }}
            onClick={() => onZoom(imgSrc)}
          />
        </div>
        <div className="flex-1 flex flex-col gap-[4px]">
          <span className="text-[8px] text-center" style={{ ...MONO, color: `rgb(${rgb})` }}>
            DAAM heatmap: "{token}"
          </span>
          <img
            src={daamSrc}
            alt={`daam ${token}`}
            loading="lazy"
            className="w-full rounded-[5px] object-cover hover:opacity-90 transition-opacity"
            style={{ aspectRatio: "1/1", cursor: "zoom-in" }}
            onClick={() => onZoom(daamSrc)}
          />
        </div>
      </div>

      <p className="text-[9px] leading-[1.4]" style={{ ...MONO, color: `rgb(${rgb})` }}>
        "{promptLabel}" — {notes[activeKind]}
      </p>
      <p className="text-[8px] text-[#a39d8e]" style={MONO}>
        DAAM · SD 2.1 · CFG 7 · seed 00 · click images to enlarge
      </p>
    </div>
  );
}

// ─── Intraset Scatter — distance vs homogeneity bubble chart ────────────────
// Built directly from distances.json + intraset_sim.json — all 6 situations x 8 countries.

const ALL_SITUATIONS = ["breakfast", "celebration", "family", "funeral", "school", "wedding"];
const SIT_COLORS: Record<string, string> = {
  wedding: "#f472b6", breakfast: "#34d399", funeral: "#94a3b8",
  celebration: "#fbbf24", family: "#818cf8", school: "#38bdf8",
};

type ScatterPoint = { sit: string; cc: string; dist: number; sim: number };
const SCATTER_POINTS: ScatterPoint[] = ALL_SITUATIONS.flatMap((sit) => {
  const dists = DISTANCES[sit] ?? {};
  const sims = INTRASET[sit] ?? {};
  return Object.keys(dists)
    .filter((code) => sims[code])
    .map((code) => ({ sit, cc: code, dist: dists[code].mean, sim: sims[code].mean }));
});

// Least-squares slope of sim (homogeneity) on dist (distance from default), per
// situation — the trend line's slope is "how much does moving away from the
// default predict collapsing to a stereotype" for that event.
function linreg(points: { dist: number; sim: number }[]) {
  const n = points.length;
  const xBar = points.reduce((s, p) => s + p.dist, 0) / n;
  const yBar = points.reduce((s, p) => s + p.sim, 0) / n;
  const num = points.reduce((s, p) => s + (p.dist - xBar) * (p.sim - yBar), 0);
  const den = points.reduce((s, p) => s + (p.dist - xBar) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = yBar - slope * xBar;
  return { slope, intercept };
}

const SITUATION_SLOPES: Record<string, { slope: number; intercept: number }> = Object.fromEntries(
  ALL_SITUATIONS.map((sit) => [sit, linreg(SCATTER_POINTS.filter((p) => p.sit === sit))]),
);
const SLOPE_RANKING = [...ALL_SITUATIONS].sort((a, b) => SITUATION_SLOPES[b].slope - SITUATION_SLOPES[a].slope);

function IntrasetScatter({ sitId }: { sitId: string }) {
  const [hov, setHov] = useState<ScatterPoint | null>(null);
  const W = 280; const H = 190;
  const PAD = { l: 32, r: 10, t: 10, b: 28 };
  const px = (d: number) => PAD.l + d * (W - PAD.l - PAD.r);
  const py = (s: number) => H - PAD.b - s * (H - PAD.t - PAD.b);

  const visiblePoints = SCATTER_POINTS.filter((pt) => pt.sit === sitId);
  const color = SIT_COLORS[sitId] ?? "#999";
  const { slope, intercept } = SITUATION_SLOPES[sitId] ?? { slope: 0, intercept: 0 };
  const clampY = (y: number) => Math.max(0, Math.min(1, y));
  const rank = SLOPE_RANKING.indexOf(sitId) + 1;

  return (
    <div className="p-3 flex flex-col gap-2">
      <p className="text-[10px] text-[#555] leading-[1.5]">
        <b>X = how far</b> a country-qualified prompt sits from SD's unqualified default
        (DINOv2 cosine distance between mean embeddings). <b>Y = how uniform</b> that
        country's own 50 images look to each other (mean pairwise cosine similarity).
        The correlation is the finding: countries far from the default don't get richer,
        more varied representation — they collapse to a single stereotype.
      </p>
      <div className="flex gap-3 items-start">
        <svg width={W} height={H} style={{ flexShrink: 0 }}>
          {/* Axes */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H-PAD.b} stroke="#e0ddd6" strokeWidth="1"/>
          <line x1={PAD.l} y1={H-PAD.b} x2={W-PAD.r} y2={H-PAD.b} stroke="#e0ddd6" strokeWidth="1"/>
          {/* Grid lines */}
          {[0.25,0.5,0.75,1.0].map(v => (
            <line key={v} x1={PAD.l} y1={py(v)} x2={W-PAD.r} y2={py(v)} stroke="#f0ede6" strokeWidth="1"/>
          ))}
          {/* Axis labels */}
          <text x={PAD.l-2} y={py(0.25)} fontSize="7" fill="#a39d8e" textAnchor="end" fontFamily="JetBrains Mono,monospace" dominantBaseline="middle">0.25</text>
          <text x={PAD.l-2} y={py(0.5)}  fontSize="7" fill="#a39d8e" textAnchor="end" fontFamily="JetBrains Mono,monospace" dominantBaseline="middle">0.5</text>
          <text x={PAD.l-2} y={py(0.75)} fontSize="7" fill="#a39d8e" textAnchor="end" fontFamily="JetBrains Mono,monospace" dominantBaseline="middle">0.75</text>
          {[0,0.25,0.5,0.75,1.0].map(v => (
            <text key={v} x={px(v)} y={H-PAD.b+9} fontSize="7" fill="#a39d8e" textAnchor="middle" fontFamily="JetBrains Mono,monospace">{v.toFixed(2)}</text>
          ))}
          {/* Linear trend — dashed, semi-transparent; slope = how strongly distance predicts homogeneity */}
          <line
            x1={px(0)} y1={py(clampY(intercept))}
            x2={px(1)} y2={py(clampY(slope + intercept))}
            stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.45"
          />
          {/* Points */}
          {visiblePoints.map((pt, i) => (
            <g key={i} onMouseEnter={() => setHov(pt)} onMouseLeave={() => setHov(null)} style={{ cursor: "default" }}>
              <circle cx={px(pt.dist)} cy={py(pt.sim)} r="5" fill={color} opacity="0.75"/>
              <text x={px(pt.dist)+6} y={py(pt.sim)} fontSize="6.5" fill="#555" fontFamily="JetBrains Mono,monospace" dominantBaseline="middle">{pt.cc}</text>
            </g>
          ))}
        </svg>
        {/* Axis legend + tooltip */}
        <div className="flex flex-col gap-2 pt-1 w-[110px]">
          <div className="text-[8px] text-[#555] leading-[1.5]" style={MONO}>
            <b>x</b>: distance from default<br/>
            <b>y</b>: output homogeneity
          </div>
          <div className="text-[8px] leading-[1.5]" style={{ ...MONO, color }}>
            θ (slope) = {slope.toFixed(2)}<br/>
            <span style={{ color: "#a39d8e" }}>rank {rank}/{ALL_SITUATIONS.length} steepest</span>
          </div>
          {hov && (
            <div className="mt-1 p-2 rounded-[5px] border border-[#d0cdc6] bg-white text-[8px] leading-[1.6]" style={MONO}>
              <b>{hov.sit} · {hov.cc}</b><br/>
              dist: {hov.dist.toFixed(3)}<br/>
              sim: {hov.sim.toFixed(3)}
            </div>
          )}
        </div>
      </div>
      <p className="text-[8px] text-[#a39d8e] leading-[1.5]" style={MONO}>
        DINOv2 ViT-B/14 CLS token · n=50 seeds per country · CFG 7 · hover a bubble for exact
        values · switch situations with the chips above · dashed line = least-squares trend,
        steeper = distance from default more strongly predicts collapse to a stereotype
      </p>
      <p className="text-[9px] text-[#555] leading-[1.6] border-t border-dashed border-[#e8e5de] pt-2" style={MONO}>
        steepest → flattest across all events: {SLOPE_RANKING.map((s, i) => (
          <span key={s}>
            <b style={{ color: s === sitId ? SIT_COLORS[s] : "#555" }}>{s}</b>
            {" "}({SITUATION_SLOPES[s].slope.toFixed(2)}){i < SLOPE_RANKING.length - 1 ? " > " : ""}
          </span>
        ))}
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

// ─── Tool 10d — Cluster gravity, 1 vs. all (real DINOv2 pairwise matrix) ────
// Fixes a country, shows all 6 situations: distance to default, and which
// other country's cluster it lands nearest to (excluding self/default).

type PairwiseJson = { results: Record<string, Record<string, Record<string, number>>> };
const PAIRWISE = (pairwiseData as PairwiseJson).results;

function CountryClusterGravity() {
  const [code, setCode] = useState("NG");

  const rows = CULTURAL_SITUATIONS.map((sit) => {
    const distMap = PAIRWISE[sit.id]?.[code] ?? {};
    const toDefault = distMap["default"] ?? 0;
    const others = Object.entries(distMap).filter(([c]) => c !== code && c !== "default");
    const [nearestCode, nearestDist] = others.length
      ? others.reduce((a, b) => (b[1] < a[1] ? b : a))
      : ["—", 0];
    const intraset = INTRASET[sit.id]?.[code]?.mean ?? 0;
    return { sitLabel: sit.label, toDefault, nearestCode, nearestDist, intraset };
  });

  const freq: Record<string, number> = {};
  rows.forEach((r) => { freq[r.nearestCode] = (freq[r.nearestCode] ?? 0) + 1; });
  const [topNeighbor, topCount] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];
  const maxDist = Math.max(...rows.map((r) => Math.max(r.toDefault, r.nearestDist)), 0.01);

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] text-[#8a8374] shrink-0" style={MONO}>country:</span>
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            onClick={() => setCode(c.code)}
            className="text-[10px] px-[9px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: code === c.code ? "#064e3b" : "#f5f4f0",
              color: code === c.code ? "#d1fae5" : "#555",
              borderColor: code === c.code ? "#064e3b" : "#d0cdc6",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-[7px]">
        {rows.map((r) => (
          <div key={r.sitLabel} className="flex items-center gap-2">
            <span className="text-[9px] text-[#867f6f] w-[64px] text-right shrink-0" style={MONO}>
              {r.sitLabel}
            </span>
            <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 rounded-[2px]"
                style={{ left: 0, width: `${(r.toDefault / maxDist) * 100}%`, background: "#94a3b8" }}
                title={`distance to default: ${r.toDefault.toFixed(3)}`}
              />
              <div
                className="absolute top-0 bottom-0 rounded-[2px]"
                style={{ left: 0, width: `${(r.nearestDist / maxDist) * 100}%`, background: "#f59e0b", opacity: 0.85 }}
                title={`distance to nearest cluster (${COUNTRY_BY_CODE[r.nearestCode]?.label}): ${r.nearestDist.toFixed(3)}`}
              />
            </div>
            <span className="text-[9px] text-[#867f6f] w-[130px] shrink-0" style={MONO}>
              → {COUNTRY_BY_CODE[r.nearestCode]?.label ?? r.nearestCode} ({r.nearestDist.toFixed(2)})
            </span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={MONO}>
        <span style={{ color: "#94a3b8" }}>■</span> distance to unqualified default &nbsp;
        <span style={{ color: "#f59e0b" }}>■</span> distance to nearest other country's cluster (label at right)
      </p>
      <p className="text-[10px] text-[#555] leading-[1.6] border-t border-dashed border-[#e8e5de] pt-2">
        Across the 6 situations, <b>{COUNTRY_BY_CODE[code]?.label}</b> lands nearest to{" "}
        <b>{COUNTRY_BY_CODE[topNeighbor]?.label ?? topNeighbor}</b> in {topCount}/6 —{" "}
        {topCount >= 4
          ? "a recurring pull toward the same cluster, not just away from the default."
          : topCount >= 2
          ? "a partial pull toward one recurring cluster, mixed with situation-specific neighbors."
          : "no single recurring attractor — its nearest cluster changes with the situation."}
      </p>
    </div>
  );
}

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
  // Shared cultural situation state — drives Tools 09, 10, 10b together
  const [sitId, setSitId] = useState("wedding");
  // Lightbox
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  return (
    <>
    {zoomedSrc && <Lightbox src={zoomedSrc} onClose={() => setZoomedSrc(null)} />}
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
      </ToolsGrid>

      <SubsectionLabel
        explanation="Cultural defaults are harder to see than demographic ones because they often feel like neutral design choices — a particular kitchen layout, a particular wedding dress style. But these choices encode a specific cultural vantage point that becomes visible as soon as you add geographic context to the same prompt."
      >
        3b — Cultural defaults
      </SubsectionLabel>

      <PredictionReveal
        question="Before we show you — which everyday situation do you think shows the biggest visual difference when you add a country qualifier to the prompt?"
        options={CULTURAL_SITUATIONS}
        onReveal={(picked) => setSitId(picked)}
      >
        {/* Shared situation selector — drives all three tools below */}
        <div className="flex gap-[6px] items-center mb-4">
          <span className="text-[10px] text-[#867f6f]" style={MONO}>situation:</span>
          {CULTURAL_SITUATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSitId(s.id)}
              className="text-[10px] px-[10px] py-[4px] rounded-[4px] border transition-colors"
              style={{
                ...MONO,
                background: sitId === s.id ? "#064e3b" : "#f5f4f0",
                color: sitId === s.id ? "#d1fae5" : "#555",
                borderColor: sitId === s.id ? "#064e3b" : "#d0cdc6",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <ToolsGrid cols={2}>
          <ToolCard
            num="09"
            name="Side-by-side cultural image grids"
            type="Interactive grid"
            description="Same concept in default / Nigeria / Japan — the selector above switches situation across all three cultural tools. Click any image to enlarge."
            explanation="The default outputs reveal SD's implicit cultural baseline. Adding 'in Nigeria' or 'in Japan' produces dramatically different compositions, colour palettes, and material cultures. The unqualified prompt is indistinguishable from a Western framing — not because the model lacks other cultural knowledge, but because it treats one perspective as the unmarked default."
          >
            <CulturalGrid sitId={sitId} onZoom={setZoomedSrc} />
          </ToolCard>

          <ToolCard
            num="10"
            name="Distance from the default"
            type="Bar chart"
            description="DINOv2 cosine distance between the mean embedding of the unqualified prompt and each country-qualified variant. n=50 seeds, 95% bootstrap CI."
            explanation="Small distance means adding a geographic qualifier changes almost nothing — that geography is already the model's default. Large distance measures how far SD must travel to represent that culture. DINOv2 is used instead of CLIP to avoid measuring CLIP's own bias with CLIP."
          >
            <EmbeddingDistanceBars sitId={sitId} />
          </ToolCard>

          <ToolCard
            num="10b"
            name="Stereotyping rate vs default"
            type="Bar chart"
            description="(country_sim − default_sim) / default_sim — how much more (or less) homogeneous each country's output is compared to the unqualified default. Red = strongly stereotyped, green = more diverse than default."
            explanation="Relative change makes the default the natural zero baseline. A country at +50% produces outputs 50% more uniform than the plain unqualified prompt — the model has collapsed to a narrow stereotype. Negative values are rare but exist (e.g. Egypt for breakfast) showing some qualifiers actually diversify the output."
          >
            <IntrasetBars sitId={sitId} />
          </ToolCard>

          <ToolCard
            num="10c"
            name="Distance vs homogeneity — the stereotype gap"
            type="Scatter"
            description="One bubble per country, for the situation selected above. Countries far from SD's cultural default (right) tend to produce more stereotyped output (up). Hover any bubble for values."
            explanation="The scatter makes the mechanism visible: distance from default and output homogeneity are correlated. The model doesn't have rich knowledge of underrepresented cultures — it has one narrow image. Specifying those cultures doesn't unlock diversity; it collapses to a stereotype."
          >
            <IntrasetScatter sitId={sitId} />
          </ToolCard>
        </ToolsGrid>
      </PredictionReveal>

      <ToolsGrid cols={1}>
        <ToolCard
          num="10d"
          name="Cluster gravity — 1 vs. all countries"
          type="Interactive"
          description="Flip the axis: pick a country and see all 6 situations at once. Does adding this country to an event just push the output away from the default, or does it pull toward one specific other country's cluster?"
          explanation="Tools 09–10c fix the situation and compare countries. This inverts it: fix the country and look across situations, using the same DINOv2 embeddings extended to the full pairwise (not just vs.-default) distance matrix. If a country's nearest neighbor is consistently the same other country rather than the default, the model doesn't hold a distinct representation for it — it's on loan from a shared 'non-Western' attractor."
          fullWidth
        >
          <CountryClusterGravity />
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
          <DAAMOverlay onZoom={setZoomedSrc} />
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
    </>
  );
}
