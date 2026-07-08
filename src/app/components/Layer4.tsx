import { useState, useMemo } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Section, ToolCard, ToolsGrid, PlanNote, Lightbox } from "./ToolCard";
import lockupCurveData from "../../data/cultural/lockup_curve.json";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ─── Tool 13 — Timestep swap: attribute injection ───────────────────────────
// Start denoising with the bare prompt (A), at step k switch to the
// attribute-override prompt (B). If the output still shows A's default,
// the assumption was already locked in before step k.
//
// 12 country pairs × bidirectional = 24 directions, across all 6 events.
// Source: src/materials/analysis/cultural/lockup_curve.json (DINOv2 centroid
// proximity, 12 seeds/step) + real swap images in public/images/swaps/.

const STEP_NAMES = ["step_01", "step_05", "step_10", "step_15", "step_25"] as const;
const SWAP_SEED_SUFFIXES = ["", "_s01", "_s02"] as const; // illustration seeds only

const COUNTRY_LABEL: Record<string, string> = {
  US: "USA", DE: "Germany", RU: "Russia", IN: "India",
  ID: "Indonesia", JP: "Japan", EG: "Egypt", NG: "Nigeria",
};
const COUNTRY_IMG_ID: Record<string, string> = {
  US: "usa", DE: "germany", RU: "russia", IN: "india",
  ID: "indonesia", JP: "japan", EG: "egypt", NG: "nigeria",
};

type CurveStep = { step_idx: number; n_seeds: number; p_closer_B: number; ci_low: number; ci_high: number };
type LockupResult = { slug_A: string; slug_B: string; prompt_A: string; prompt_B: string; type: string; curve: Record<string, CurveStep> };
const LOCKUP_RESULTS = (lockupCurveData as { results: Record<string, LockupResult> }).results;

type SwapPair = {
  id: string; event: string; fromCode: string; toCode: string;
  k: number[]; p: number[]; ci_lo: number[]; ci_hi: number[];
  lockInIdx: number; lockInLabel: string;
};

function computeLockIn(kVals: number[], probs: number[]) {
  let idx = 0;
  for (let i = 0; i < probs.length; i++) if (probs[i] > 0.5) idx = i;
  const label = idx < kVals.length - 1
    ? `lock-in k≈${kVals[idx]}–${kVals[idx + 1]}`
    : `no lock-in by k=${kVals[idx]}`;
  return { idx, label };
}

const SWAP_PAIRS: SwapPair[] = Object.entries(LOCKUP_RESULTS).map(([id, r]) => {
  const m = id.match(/^([a-z]+)_([A-Z]{2})_to_([A-Z]{2})$/)!;
  const [, event, fromCode, toCode] = m;
  const k = STEP_NAMES.map((s) => r.curve[s]?.step_idx ?? 0);
  const p = STEP_NAMES.map((s) => r.curve[s]?.p_closer_B ?? 0);
  const ci_lo = STEP_NAMES.map((s) => r.curve[s]?.ci_low ?? 0);
  const ci_hi = STEP_NAMES.map((s) => r.curve[s]?.ci_high ?? 0);
  const { idx, label } = computeLockIn(k, p);
  return { id, event, fromCode, toCode, k, p, ci_lo, ci_hi, lockInIdx: idx, lockInLabel: label };
}).sort((a, b) => a.id.localeCompare(b.id));

const EVENTS = Array.from(new Set(SWAP_PAIRS.map((p) => p.event))).sort();

function LockInCurve({ pair }: { pair: SwapPair }) {
  const { k: kVals, p: probs, ci_lo, ci_hi, lockInIdx, lockInLabel } = pair;

  const w = 240;
  const h = 110;
  const n = kVals.length;
  const px = (i: number) => 18 + (i / (n - 1)) * (w - 34);
  const py = (p: number) => 12 + (1 - p) * (h - 34);

  const linePts  = probs.map((p, i) => `${px(i)},${py(p)}`).join(" ");
  const bandPts  = [
    ...probs.map((_, i) => `${px(i)},${py(Math.min(1, ci_hi[i]))}`),
    ...[...probs].reverse().map((_, i) => `${px(n - 1 - i)},${py(Math.max(0, ci_lo[n - 1 - i]))}`),
  ].join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h}>
        <polygon points={bandPts} fill="rgba(129,140,248,0.15)" />
        <line x1="18" y1={py(0.5)} x2={w - 16} y2={py(0.5)} stroke="#e0ddd6" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={px(lockInIdx)} y1="10" x2={px(lockInIdx)} y2={h - 20} stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
        <polyline points={linePts} fill="none" stroke="#4f46e5" strokeWidth="1.5" />
        {probs.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p)} r="2.4" fill="#4f46e5" />
        ))}
        {kVals.map((k, i) => (
          <text key={k} x={px(i)} y={h - 6} fontSize="7" fill="#8a8374" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {k}
          </text>
        ))}
        <text x={px(lockInIdx) + 4} y="16" fontSize="7" fill="#ef4444" fontFamily="JetBrains Mono, monospace">
          {lockInLabel}
        </text>
        <text x="14" y={py(0.5) - 3} fontSize="7" fill="#a39d8e" fontFamily="JetBrains Mono, monospace">
          50%
        </text>
      </svg>
      <span className="text-[8px] text-[#8a8374]" style={MONO}>
        P(override wins) vs swap step · 12 seeds per point · real data
      </span>
    </div>
  );
}

function TimestepSlider() {
  const [event, setEvent] = useState("wedding");
  const [pairId, setPairId] = useState("wedding_NG_to_US");
  const [kIdx, setKIdx] = useState(0);
  const [seedIdx, setSeedIdx] = useState(0);
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  const pairsForEvent = useMemo(() => SWAP_PAIRS.filter((p) => p.event === event), [event]);
  const pair = pairsForEvent.find((p) => p.id === pairId) ?? pairsForEvent[0];

  const handleEvent = (ev: string) => {
    setEvent(ev);
    const first = SWAP_PAIRS.find((p) => p.event === ev);
    if (first) setPairId(first.id);
    setKIdx(0);
    setSeedIdx(0);
  };

  const seedSuffix = SWAP_SEED_SUFFIXES[seedIdx];
  const fromLabel = COUNTRY_LABEL[pair.fromCode] ?? pair.fromCode;
  const toLabel = COUNTRY_LABEL[pair.toCode] ?? pair.toCode;
  const originImg = `/images/cultural/${event}_${COUNTRY_IMG_ID[pair.fromCode]}${seedIdx === 0 ? "" : `_0${seedIdx}`}.webp`;
  const swapImgs = STEP_NAMES.map((step) => `/images/swaps/${pair.id}_${step}${seedSuffix}.webp`);

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Event / pair selectors */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[9px] text-[#8a8374]" style={MONO}>event:</span>
        <select
          value={event}
          onChange={(e) => handleEvent(e.target.value)}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={MONO}
        >
          {EVENTS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
        </select>
        <span className="text-[9px] text-[#8a8374]" style={MONO}>pair:</span>
        <select
          value={pair.id}
          onChange={(e) => { setPairId(e.target.value); setKIdx(0); setSeedIdx(0); }}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={MONO}
        >
          {pairsForEvent.map((p) => (
            <option key={p.id} value={p.id}>
              {COUNTRY_LABEL[p.fromCode]} → {COUNTRY_LABEL[p.toCode]}
            </option>
          ))}
        </select>
      </div>

      {/* Tokenized prompt display */}
      <div className="flex flex-wrap gap-[4px] items-center">
        <span className="text-[9px] text-[#8a8374]" style={MONO}>start:</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#f0ede6] text-[#555] border border-[#d0cdc6]" style={MONO}>a</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#f0ede6] text-[#555] border border-[#d0cdc6]" style={MONO}>{event}</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#f0ede6] text-[#555] border border-[#d0cdc6]" style={MONO}>in</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#fef3c7] text-[#92400e] border border-[#fbbf24] font-semibold" style={MONO}>{fromLabel}</span>
        <span className="text-[9px] text-[#8a8374] mx-1" style={MONO}>→ at step k →</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#f0ede6] text-[#555] border border-[#d0cdc6]" style={MONO}>a</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#f0ede6] text-[#555] border border-[#d0cdc6]" style={MONO}>{event}</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#f0ede6] text-[#555] border border-[#d0cdc6]" style={MONO}>in</span>
        <span className="text-[10px] px-[7px] py-[2px] rounded-[4px] bg-[#d1fae5] text-[#064e3b] border border-[#34d399] font-semibold" style={MONO}>{toLabel}</span>
      </div>

      {/* Image viewer */}
      {zoomedSrc && <Lightbox src={zoomedSrc} onClose={() => setZoomedSrc(null)} />}

      <div className="flex flex-col gap-3">
          {/* Two images side by side */}
          <div className="flex gap-3 items-start">
            <div className="flex-1 flex flex-col gap-[5px]">
              <span className="text-[9px] text-[#8a8374] text-center" style={MONO}>
                prompt A — no swap
              </span>
              <img
                src={originImg}
                alt="prompt A original"
                loading="lazy"
                className="w-full rounded-[6px] object-cover hover:opacity-90 transition-opacity"
                style={{ aspectRatio: "1 / 1", cursor: "zoom-in" }}
                onClick={() => setZoomedSrc(originImg)}
              />
              <span className="text-[9px] text-[#555] text-center truncate" style={MONO}>
                "a {event} in {fromLabel}"
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-[5px]">
              <span className="text-[9px] text-[#8a8374] text-center" style={MONO}>
                swapped at k={pair.k[kIdx]} → prompt B
              </span>
              <img
                src={swapImgs[kIdx]}
                alt={`swap at step ${pair.k[kIdx]}`}
                loading="lazy"
                className="w-full rounded-[6px] object-cover transition-all duration-200 hover:opacity-90"
                style={{ aspectRatio: "1 / 1", outline: kIdx <= pair.lockInIdx ? "2px solid #34d399" : "2px solid #ef4444", outlineOffset: "2px", cursor: "zoom-in" }}
                onClick={() => setZoomedSrc(swapImgs[kIdx])}
              />
              <span className="text-[9px] text-center truncate" style={{ ...MONO, color: kIdx <= pair.lockInIdx ? "#059669" : "#dc2626" }}>
                {kIdx <= pair.lockInIdx ? "✓ B wins — swap worked" : "✗ A locked in — too late"}
              </span>
            </div>

            <div className="flex-[1.2] pt-1">
              <LockInCurve pair={pair} />
            </div>
          </div>

          {/* Slider spanning full width */}
          <Slider.Root
            className="relative flex items-center select-none touch-none h-5"
            min={0}
            max={pair.k.length - 1}
            step={1}
            value={[kIdx]}
            onValueChange={([v]) => setKIdx(v)}
          >
            <Slider.Track className="relative h-[3px] flex-1 rounded-full" style={{ background: "#e0ddd6" }}>
              <Slider.Range className="absolute h-full rounded-full" style={{ background: "#818cf8" }} />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 rounded-full shadow-sm border" style={{ background: "#fff", borderColor: "#818cf8" }} />
          </Slider.Root>
          {/* Seed navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSeedIdx(Math.max(0, seedIdx - 1))}
              disabled={seedIdx === 0}
              className="text-[10px] px-[8px] py-[2px] rounded-[3px] border disabled:opacity-30 transition-colors"
              style={{ ...MONO, borderColor: "#d0cdc6", color: "#555" }}
            >←</button>
            <span className="text-[9px] text-[#8a8374] flex-1 text-center" style={MONO}>
              seed {seedIdx + 1} / {SWAP_SEED_SUFFIXES.length} — use multiple seeds to see the pattern holds
            </span>
            <button
              onClick={() => setSeedIdx(Math.min(SWAP_SEED_SUFFIXES.length - 1, seedIdx + 1))}
              disabled={seedIdx === SWAP_SEED_SUFFIXES.length - 1}
              className="text-[10px] px-[8px] py-[2px] rounded-[3px] border disabled:opacity-30 transition-colors"
              style={{ ...MONO, borderColor: "#d0cdc6", color: "#555" }}
            >→</button>
          </div>
          <p className="text-[9px] text-[#8a8374] text-center" style={MONO}>
            drag slider to change swap step · green = B wins · red = A locked in · click images to enlarge
          </p>
      </div>
    </div>
  );
}

// ─── Tool 14 — Similarity ranking with hover thumbnails ────────────────────

const RANKED_PROMPTS = [
  { rank: 1, label: "a CEO",       sim: 0.91, shades: ["#c8b8a8", "#c4b4a4", "#c8b8a8"] },
  { rank: 2, label: "a doctor",    sim: 0.84, shades: ["#c0b0a0", "#bca89a", "#c0ae9e"] },
  { rank: 3, label: "a scientist", sim: 0.76, shades: ["#c4beb8", "#c0bab4", "#c4beb8"] },
  { rank: 4, label: "a teacher",   sim: 0.68, shades: ["#c8c4c0", "#c4c0bc", "#c8c4c0"] },
];

function SimilarityRanking() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="p-3 flex flex-col gap-[8px] justify-center min-h-[140px]">
      {RANKED_PROMPTS.map((r) => (
        <div key={r.rank}>
          <div
            className="flex items-center gap-[8px] cursor-pointer rounded-[4px] px-1 py-[2px] transition-colors"
            style={{ background: hovered === r.rank ? "#f5f3ee" : "transparent" }}
            onMouseEnter={() => setHovered(r.rank)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="text-[9px] text-[#8a8374] w-4 shrink-0" style={MONO}>
              {r.rank}
            </span>
            <div className="flex gap-[2px] shrink-0">
              {r.shades.map((s, i) => (
                <div key={i} className="w-[22px] h-[22px] rounded-[3px]" style={{ background: s }} />
              ))}
            </div>
            <span className="text-[9px] text-[#888] w-[72px] shrink-0" style={MONO}>
              {r.label}
            </span>
            <div className="flex-1 h-[6px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${r.sim * 100}%`, background: r.rank <= 2 ? "#f97316" : "#fdba74" }}
              />
            </div>
            <span className="text-[9px] text-[#867f6f] w-[28px] text-right shrink-0" style={MONO}>
              {r.sim.toFixed(2)}
            </span>
          </div>
          {hovered === r.rank && (
            <div className="flex gap-[2px] pl-[34px] pt-[4px]">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="w-[20px] h-[20px] rounded-[2px]"
                  style={{ background: r.shades[i % 3], opacity: 0.85 }}
                  title={`seed ${i}`}
                />
              ))}
              <span className="text-[8px] text-[#8a8374] self-center pl-2" style={MONO}>
                …50 face crops behind this number
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tool 15 — Three-way masking ────────────────────────────────────────────

function ThreeWayMask() {
  return (
    <div className="flex flex-col">
      <div className="flex gap-[6px] p-3 h-[130px]">
        <div className="flex-1 rounded-[5px] bg-[#c8c0b8] relative overflow-hidden">
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#888]" style={MONO}>
            original
          </span>
        </div>
        <div className="flex-1 rounded-[5px] bg-[#c8c0b8] relative overflow-hidden">
          <div
            className="absolute rounded-[3px]"
            style={{
              top: "18%", left: "22%", width: "56%", height: "52%",
              background: "repeating-linear-gradient(0deg, rgba(240,236,228,0.92) 0px, rgba(240,236,228,0.92) 5px, rgba(220,214,204,0.92) 5px, rgba(220,214,204,0.92) 10px)",
              border: "1.5px solid rgba(255,255,255,0.7)",
            }}
          />
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#888]" style={MONO}>
            face blur
          </span>
        </div>
        <div className="flex-1 rounded-[5px] bg-[#c8c0b8] relative overflow-hidden">
          <div
            className="absolute rounded-[2px]"
            style={{
              top: "8%", left: "52%", width: "36%", height: "34%",
              background: "repeating-linear-gradient(90deg, rgba(240,236,228,0.92) 0px, rgba(240,236,228,0.92) 5px, rgba(220,214,204,0.92) 5px, rgba(220,214,204,0.92) 10px)",
              border: "1.5px solid rgba(255,255,255,0.7)",
            }}
          />
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#888]" style={MONO}>
            random blur
          </span>
        </div>
      </div>
      <div className="flex gap-5 px-4 pb-3 text-[10px] text-[#888]" style={MONO}>
        <span>face shift: <b className="text-[#1a1a1a] font-semibold">0.18</b></span>
        <span>random shift: <b className="text-[#1a1a1a] font-semibold">0.06</b></span>
        <span>residual: <b style={{ color: "#ef4444" }}>+0.12</b> — face region carries the assumption</span>
      </div>
    </div>
  );
}

// ─── Tool 16 — Prompt builder: slot-based probe ─────────────────────────────
// Same sentence structure, every slot swappable. Every combination is a
// precomputed batch of 50 — the user navigates data, not live inference.

const TEMPLATES = ["{occ}", "a {occ}", "a photo of a {occ}"];
const OCCS = ["doctor", "nurse", "CEO", "scientist"];
const OBJECTS = ["—", "a flower", "a sports car", "a minivan", "a family", "a microscope"];

// male-read per template per occupation (placeholder; format alone shifts the skew)
const TEMPLATE_BASE: Record<string, number[]> = {
  doctor:    [0.62, 0.68, 0.90],
  nurse:     [0.22, 0.14, 0.04],
  CEO:       [0.74, 0.82, 0.95],
  scientist: [0.66, 0.75, 0.88],
};

// male-read delta added by the object slot (placeholder)
const OBJECT_DELTA = [0, -0.14, 0.19, -0.19, -0.27, 0.08];

function clamp(v: number) {
  return Math.min(0.98, Math.max(0.02, v));
}

const slotSelect =
  "text-[11px] border border-[#c7c2b8] rounded-[4px] px-1 py-[3px] bg-[#fdfcf9] focus:outline-none focus:border-[#818cf8] transition-colors";

function PromptBuilder() {
  const [tIdx, setTIdx] = useState(1);
  const [occ, setOcc] = useState("doctor");
  const [objIdx, setObjIdx] = useState(0);

  const base = TEMPLATE_BASE[occ][tIdx];
  const value = clamp(base + OBJECT_DELTA[objIdx]);
  const sentence = TEMPLATES[tIdx].replace("{occ}", occ);

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[12px] text-[#555] leading-[1.6]">
        None of these changes should matter. <i>"A photo of a doctor"</i> means the same as{" "}
        <i>"a doctor"</i>. A minivan says nothing about a person. For every combination we
        generated <b>50 images</b> — the bar shows <b>how many depict a man</b>. Watch how much
        meaning the model finds in changes that have none.
      </p>

      {/* The sentence with slots */}
      <div className="flex flex-wrap items-center gap-[6px] text-[13px] text-[#1a1a1a]" style={MONO}>
        <select value={tIdx} onChange={(e) => setTIdx(Number(e.target.value))} className={slotSelect} style={MONO}>
          <option value={0}>"___"</option>
          <option value={1}>"a ___"</option>
          <option value={2}>"a photo of a ___"</option>
        </select>
        <span className="text-[#a39d8e]">·</span>
        <select value={occ} onChange={(e) => setOcc(e.target.value)} className={slotSelect} style={MONO}>
          {OCCS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <span className="text-[#a39d8e]">·</span>
        <span className="text-[11px] text-[#888]">next to</span>
        <select value={objIdx} onChange={(e) => setObjIdx(Number(e.target.value))} className={slotSelect} style={MONO}>
          {OBJECTS.map((o, i) => (
            <option key={o} value={i}>
              {o}
            </option>
          ))}
        </select>
        <span className="text-[9px] text-[#a39d8e]" style={MONO}>
          (optional)
        </span>
      </div>

      {/* Resulting prompt */}
      <div className="text-[12px] text-[#555]">
        prompt:{" "}
        <code className="bg-[#f5f4f0] px-[6px] py-[2px] rounded text-[11px]" style={MONO}>
          {sentence}
          {objIdx > 0 ? ` next to ${OBJECTS[objIdx]}` : ""}
        </code>
      </div>

      {/* Result bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#867f6f] w-[70px] text-right shrink-0" style={MONO}>
          men shown
        </span>
        <div className="flex-1 h-[14px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
          <div
            className="h-full rounded-[3px]"
            style={{ width: `${value * 100}%`, background: "#4f46e5", transition: "width 0.5s ease" }}
          />
        </div>
        <span className="text-[10px] text-[#1a1a1a] font-semibold w-[64px] shrink-0" style={MONO}>
          {Math.round(value * 50)} / 50
        </span>
      </div>

      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={MONO}>
        every combination = a precomputed batch of 50 images · note: even the sentence format is
        a trigger — "a photo of a {occ}" skews harder than "{occ}" alone
      </p>
    </div>
  );
}

// ─── Layer 4 export ─────────────────────────────────────────────────────────

export function Layer4() {
  return (
    <Section
      id="l4"
      badge={{ label: "Layer 4", variant: "l4" }}
      title="Depth — how locked in the assumptions are"
      question="How hard is it to escape?"
      explanation="Knowing that defaults exist is not enough — we need to know how structurally entrenched they are. The timestep experiment reveals when an assumption becomes irreversible. The masking experiment localizes where in the image it lives. The prompt builder shows that every word — even the sentence format itself — steers the outcome."
    >
      <PlanNote
        purpose="Measure how deep the assumptions go: when they lock in, where they live, how tight the output bubble is, and how every slot of the prompt steers them."
        computed="Lock-in: 12 country pairs × bidirectional × 5 swap steps × 12 seeds → flip-probability curve, across all 6 cultural events. Masking: face vs. random blur, residual shift. Similarity: DINOv2 over 50 face crops. Builder: n=50 per slot combination."
        useful="Every effect has a control (random mask, multi-seed curve, matched objects) — findings, not anecdotes."
        interaction="Drag the swap slider; build prompts from slots; hover rows for the face crops behind each score."
      />
      <ToolsGrid cols={2}>
        <ToolCard
          num="13"
          name="Timestep swap — when the assumption locks in"
          type="Interactive slider + curve"
          description="Pick an event and a country pair, either direction. Start denoising with one country's prompt, switch to the other at step k. The curve shows how often the override still wins (12 seeds per point); lock-in = the 50% crossing."
          explanation="The committed structure of the image — who is in it, whose culture frames it, what color things are — is decided in the first denoising steps, long before anything is recognizable. After the lock-in point, even an explicit override arrives too late. Lock-in is stochastic, so the result is a probability curve, not a single threshold; the strip shows one seed so the effect is visible."
          fullWidth
        >
          <TimestepSlider />
        </ToolCard>

        <ToolCard
          num="14"
          name="Intra-set similarity ranking"
          type="Ranked list"
          description="DINOv2 similarity averaged across 50 face crops per prompt — hover a row to see the faces behind the number."
          explanation="A high score means the model generates nearly the same face across all 50 seeds — the prior overwhelms seed-level variation. Computed on face crops to isolate demographics from background."
        >
          <SimilarityRanking />
        </ToolCard>

        <ToolCard
          num="15"
          name="Three-way masking — spatial localization"
          type="Image trio"
          description="Original / face blurred / random region blurred. The residual (face shift minus random shift) shows which region carries the assumption."
          explanation="Blurring anything shifts a CLIP embedding — that's why the random-region control exists. Only the residual counts: the face shifts the embedding far more than an equal random area, so the assumption is localized in the face."
        >
          <ThreeWayMask />
        </ToolCard>

        <ToolCard
          num="16"
          name="No neutral words — meaningless edits, measurable shifts"
          type="Interactive"
          description="Swap slots that carry no demographic meaning — the sentence format, a background object — and the distribution moves anyway. The point is not to build a prompt; it is that there is nothing neutral to build it from."
          explanation="Every slot here is semantically empty with respect to the person: 'a photo of a' adds no information, a minivan describes a car. Yet each swap shifts who appears, because the model reads every word through its learned associations. This is the project's claim in miniature: the prompt is never the whole input — it is always evaluated inside the model's worldview, and that worldview leaks through even the words that say nothing."
          fullWidth
        >
          <PromptBuilder />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
