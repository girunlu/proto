import { useState } from "react";
import { Section, ToolCard, ToolsGrid, PlanNote, Lightbox } from "./ToolCard";
import diverseGridData from "../../data/cultural/diverse_grid.json";
import cfgDistanceData from "../../data/cultural/cfg_distance.json";

// ─── Tool 04 — Empty-prompt prior ───────────────────────────────────────────

function EmptyPrompt() {
  return (
    <div className="flex gap-[6px] px-3 py-3 h-[120px]">
      <div
        className="flex-[2] rounded-[5px] flex flex-col items-center justify-center gap-2"
        style={{ background: "#d4cfc8" }}
      >
        <span className="text-[10px] text-[#888]">SD prior output</span>
        <code
          className="text-[9px] text-[#888] px-[6px] py-[2px] bg-white/60 rounded"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          prompt = &quot;&quot;
        </code>
      </div>
      <div
        className="flex-1 flex flex-col gap-[6px] justify-center text-[9px] text-[#867f6f]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <div>guidance: no-op</div>
        <div className="text-[8px] text-[#a39d8e]">(cond = uncond when prompt is empty)</div>
        <div>DDIM 30 steps</div>
        <div>seeds 0–29</div>
        <div>SD 2.1</div>
      </div>
    </div>
  );
}

// ─── Tool 05 — CFG stability, cultural version (real images + real DINOv2) ──
// Merges the old demographic placeholder (fake FairFace numbers) and the old
// wedding-only image strip into one real, data-backed tool: does the cultural
// gap (country variant vs. unqualified default) change with guidance strength?
// Source: src/materials/analysis/cultural/ — DINOv2 distance recomputed at
// every CFG level [1,4,7,12,15] the cultural run already swept (no new
// generation, see cultural_cfg_distance.py).

const CFG_VALUES = [1, 4, 7, 12, 15];

const CFG_SITUATIONS = [
  { id: "wedding", label: "a wedding" },
  { id: "funeral", label: "a funeral" },
  { id: "breakfast", label: "a breakfast" },
  { id: "family", label: "a family" },
  { id: "celebration", label: "a celebration" },
  { id: "school", label: "a school" },
];

const CFG_COUNTRIES = [
  { code: "NG", label: "Nigeria" },
  { code: "IN", label: "India" },
  { code: "JP", label: "Japan" },
  { code: "EG", label: "Egypt" },
  { code: "ID", label: "Indonesia" },
  { code: "RU", label: "Russia" },
  { code: "DE", label: "Germany" },
  { code: "US", label: "USA" },
];

type CfgDistanceJson = { results: Record<string, Record<string, Record<string, { mean: number; ci_low: number; ci_high: number }>>> };
const CFG_DISTANCE = (cfgDistanceData as CfgDistanceJson).results;

// Fixed y-scale across every event/country pair, so switching the event
// changes the curves' shape, not the axis.
const GLOBAL_MAX_CFG_DIST = Math.max(
  0.01,
  ...Object.values(CFG_DISTANCE).flatMap((byCountry) =>
    Object.values(byCountry).flatMap((byCfg) => Object.values(byCfg).map((v) => v.mean)),
  ),
);

// Same per-country identity colors used in Layer3's cluster-gravity heatmap,
// kept consistent so a country reads the same color everywhere in the site.
const CFG_COUNTRY_COLOR: Record<string, string> = {
  US: "#60a5fa", DE: "#34d399", RU: "#a78bfa", IN: "#f472b6",
  ID: "#fb923c", JP: "#38bdf8", EG: "#fbbf24", NG: "#f87171",
};

function CFGCulturalStrip() {
  const [sitId, setSitId] = useState("wedding");
  const [cfgIdx, setCfgIdx] = useState(2); // default to cfg=7
  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  const maxDist = GLOBAL_MAX_CFG_DIST;

  // Median-split countries by their mean distance-from-default across the CFG
  // sweep, for *this* event — "near" = already close to the default, "far" =
  // needs real cultural override. Recomputed per event since who's near/far
  // shifts with the situation.
  const meanDistByCountry = CFG_COUNTRIES.map((c) => {
    const vals = CFG_VALUES.map((cfg) => CFG_DISTANCE[sitId]?.[c.code]?.[String(cfg)]?.mean ?? 0);
    return { code: c.code, label: c.label, mean: vals.reduce((s, v) => s + v, 0) / vals.length };
  });
  const sortedByDist = [...meanDistByCountry].sort((a, b) => a.mean - b.mean);
  const median = sortedByDist[Math.floor(sortedByDist.length / 2)].mean;
  const groupOf = (code: string) =>
    (meanDistByCountry.find((c) => c.code === code)?.mean ?? 0) < median ? "near" : "far";

  const nearGroup = meanDistByCountry.filter((c) => c.mean < median).map((c) => c.label);
  const farGroup = meanDistByCountry.filter((c) => c.mean >= median).map((c) => c.label);
  const nearAvg = nearGroup.length ? sortedByDist.slice(0, Math.floor(sortedByDist.length / 2)).reduce((s, c) => s + c.mean, 0) / nearGroup.length : 0;
  const farAvg = farGroup.length ? sortedByDist.slice(Math.floor(sortedByDist.length / 2)).reduce((s, c) => s + c.mean, 0) / farGroup.length : 0;

  // Line chart: x = actual CFG value (so the 1→4 jump vs. the 4→15 plateau is
  // spatially honest, not evenly spaced), y = DINOv2 distance from default,
  // one line per country so all 8 are directly comparable at once. Wider now
  // that the image strip moved to a 2x2 block instead of a 5-wide row.
  const W = 420, H = 200;
  const PAD = { l: 36, r: 14, t: 12, b: 22 };
  const cfgMin = CFG_VALUES[0], cfgMax = CFG_VALUES[CFG_VALUES.length - 1];
  const px = (cfg: number) => PAD.l + ((cfg - cfgMin) / (cfgMax - cfgMin)) * (W - PAD.l - PAD.r);
  const py = (dist: number) => H - PAD.b - (dist / maxDist) * (H - PAD.t - PAD.b);

  // cfg=7 stays in the plot (it's the standard-generation data point) but is
  // dropped from the illustration strip — 4 images fit a clean 2x2 instead of 5.
  const STRIP_CFGS = CFG_VALUES.filter((c) => c !== 7);

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] text-[#8a8374] shrink-0" style={mono}>event:</span>
        {CFG_SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSitId(s.id)}
            className="text-[10px] px-[9px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...mono,
              background: sitId === s.id ? "#78350f" : "#f5f4f0",
              color: sitId === s.id ? "#fef3c7" : "#555",
              borderColor: sitId === s.id ? "#78350f" : "#d0cdc6",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-start">
        {/* Illustration: default-variant image strip across CFG (single seed),
            2x2 so the chart gets the freed-up horizontal space */}
        <div className="shrink-0 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-[6px] w-[260px]">
            {STRIP_CFGS.map((cfg) => {
              const i = CFG_VALUES.indexOf(cfg);
              return (
                <button
                  key={cfg}
                  onClick={() => setCfgIdx(i)}
                  className="flex flex-col gap-[3px] cursor-pointer bg-transparent border-0 p-0"
                >
                  <img
                    src={`/images/cfg/${sitId}_cfg${cfg}.webp`}
                    loading="lazy"
                    alt={`cfg=${cfg}`}
                    className="w-full rounded-[5px] object-cover transition-all duration-200"
                    style={{
                      aspectRatio: "1 / 1",
                      outline: cfgIdx === i ? "2px solid #92400e" : "2px solid transparent",
                      outlineOffset: "2px",
                      opacity: cfgIdx === i ? 1 : 0.6,
                    }}
                  />
                  <span className="text-[9px] text-center transition-colors"
                    style={{ ...mono, color: cfgIdx === i ? "#92400e" : "#8a8374" }}>
                    cfg={cfg}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[8px] text-[#a39d8e] w-[260px]" style={mono}>
            default variant · seed 00 · illustration only (cfg=7 omitted here, still in the chart)
          </p>
        </div>

      {/* Evidence: DINOv2 distance from default, per CFG level, one line per
          country so all 8 are compared directly instead of one at a time.
          Solid = "far" group (median split, this event), dashed = "near". */}
      <svg width={W} height={H}>
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#e0ddd6" strokeWidth="1" />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#e0ddd6" strokeWidth="1" />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.l} y1={py(f * maxDist)} x2={W - PAD.r} y2={py(f * maxDist)} stroke="#f0ede6" strokeWidth="1" />
        ))}
        <text x={PAD.l - 4} y={py(maxDist)} fontSize="7" fill="#a39d8e" textAnchor="end" fontFamily="JetBrains Mono,monospace" dominantBaseline="middle">{maxDist.toFixed(2)}</text>
        <text x={PAD.l - 4} y={py(0)} fontSize="7" fill="#a39d8e" textAnchor="end" fontFamily="JetBrains Mono,monospace" dominantBaseline="middle">0</text>
        {/* selected-cfg guide line, synced with the image strip above */}
        <line x1={px(CFG_VALUES[cfgIdx])} y1={PAD.t} x2={px(CFG_VALUES[cfgIdx])} y2={H - PAD.b} stroke="#92400e" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />

        {CFG_COUNTRIES.map((c) => {
          const rows = CFG_VALUES.map((cfg) => CFG_DISTANCE[sitId]?.[c.code]?.[String(cfg)]);
          const linePath = CFG_VALUES
            .map((cfg, i) => `${i === 0 ? "M" : "L"} ${px(cfg)} ${py(rows[i]?.mean ?? 0)}`)
            .join(" ");
          const isFar = groupOf(c.code) === "far";
          const isHov = hoverCode === c.code;
          return (
            <g
              key={c.code}
              onMouseEnter={() => setHoverCode(c.code)}
              onMouseLeave={() => setHoverCode(null)}
              opacity={hoverCode && !isHov ? 0.25 : 1}
              style={{ cursor: "default", transition: "opacity 0.15s" }}
            >
              <path
                d={linePath}
                fill="none"
                stroke={CFG_COUNTRY_COLOR[c.code]}
                strokeWidth={isHov ? 2.5 : 1.5}
                strokeDasharray={isFar ? undefined : "3 2"}
              />
              {CFG_VALUES.map((cfg, i) => (
                <circle key={cfg} cx={px(cfg)} cy={py(rows[i]?.mean ?? 0)} r={isHov ? 3 : 2} fill={CFG_COUNTRY_COLOR[c.code]} />
              ))}
            </g>
          );
        })}
      </svg>
      </div>

      {/* Legend, doubles as hover trigger + near/far group tag */}
      <div className="flex items-center gap-[10px] flex-wrap" style={mono}>
        {CFG_COUNTRIES.map((c) => (
          <span
            key={c.code}
            onMouseEnter={() => setHoverCode(c.code)}
            onMouseLeave={() => setHoverCode(null)}
            className="flex items-center gap-1 text-[8px] cursor-default"
            style={{ color: hoverCode === c.code ? "#1a1a1a" : "#8a8374" }}
          >
            <span
              className="w-[9px] h-[9px] rounded-[2px] inline-block"
              style={{ background: CFG_COUNTRY_COLOR[c.code], opacity: groupOf(c.code) === "far" ? 1 : 0.55 }}
            />
            {c.label} <span className="text-[7px]">({groupOf(c.code)})</span>
          </span>
        ))}
      </div>

      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={mono}>
        DINOv2 cosine distance between "{CFG_SITUATIONS.find(s=>s.id===sitId)?.label}" and each
        country-qualified variant, n=50 seeds per CFG level · x-axis at true CFG spacing · solid
        line = "far" group, dashed = "near" group (median split on mean distance for this event) ·
        hover a country to isolate its line
      </p>
      <p className="text-[10px] text-[#555] leading-[1.6] border-t border-dashed border-[#e8e5de] pt-2" style={mono}>
        <b>near</b> ({nearGroup.join(", ")}, mean dist {nearAvg.toFixed(2)}) sit close to the
        default already, so there's little room for a CFG spike either way — the flat, low dashed
        lines are a ceiling effect, not evidence CFG doesn't matter. <b>far</b> ({farGroup.join(", ")},
        mean dist {farAvg.toFixed(2)}) is where the cfg=1→4 rise actually happens, because there's
        real distance left to open up.
      </p>
    </div>
  );
}

// ─── Tool 05c — Cultural prior matrix (real images, most-diverse seeds) ─────
// Rows = default + 8 countries, columns = the N seeds farthest apart from each
// other (DINOv2 farthest-point sampling, see cultural_diverse_grid.py) — the
// point is to show the *spread* of the prior per variant, not near-duplicates.

type DiverseGridJson = { results: Record<string, Record<string, number[]>> };
const DIVERSE_GRID = (diverseGridData as DiverseGridJson).results;

const MATRIX_SITUATIONS = [
  { id: "wedding", label: "a wedding" },
  { id: "funeral", label: "a funeral" },
  { id: "breakfast", label: "a breakfast" },
  { id: "family", label: "a family" },
  { id: "celebration", label: "a celebration" },
  { id: "school", label: "a school" },
];

const MATRIX_ROWS = [
  { id: "default", label: "default" },
  { id: "usa", label: "USA" },
  { id: "germany", label: "Germany" },
  { id: "russia", label: "Russia" },
  { id: "india", label: "India" },
  { id: "indonesia", label: "Indonesia" },
  { id: "japan", label: "Japan" },
  { id: "egypt", label: "Egypt" },
  { id: "nigeria", label: "Nigeria" },
];

type HoverInfo = { src: string; rowLabel: string; sitLabel: string; seed: number };

function CulturalPriorMatrix({ onZoom }: { onZoom: (src: string) => void }) {
  const [sitId, setSitId] = useState("wedding");
  const [hovered, setHovered] = useState<HoverInfo | null>(null);
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const sitLabel = MATRIX_SITUATIONS.find((s) => s.id === sitId)?.label ?? sitId;

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#8a8374] shrink-0" style={mono}>event:</span>
        <select
          value={sitId}
          onChange={(e) => { setSitId(e.target.value); setHovered(null); }}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={mono}
        >
          {MATRIX_SITUATIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="flex gap-4 items-start">
        <div
          className="flex flex-col gap-[3px] overflow-x-auto"
          onMouseLeave={() => setHovered(null)}
        >
          {MATRIX_ROWS.map((row) => {
            const seeds = DIVERSE_GRID[sitId]?.[row.id] ?? [];
            return (
              <div key={row.id} className="flex items-center gap-[3px]">
                <span
                  className="text-[8px] text-[#867f6f] w-[64px] text-right shrink-0 pr-1"
                  style={mono}
                >
                  {row.label}
                </span>
                {seeds.map((seed, k) => {
                  const src = `/images/cultural/${sitId}_${row.id}_div${k}.webp`;
                  const isHovered = hovered?.src === src;
                  return (
                    <img
                      key={k}
                      src={src}
                      alt={`${sitId} ${row.label} sample ${k}`}
                      loading="lazy"
                      onMouseEnter={() => setHovered({ src, rowLabel: row.label, sitLabel, seed })}
                      onClick={() => onZoom(src)}
                      className="rounded-[2px] object-cover hover:opacity-80 transition-opacity shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        cursor: "zoom-in",
                        outline: isHovered ? "2px solid #78350f" : "2px solid transparent",
                        outlineOffset: "1px",
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Hover preview — enlarged image + info box, ~0.55x the matrix width */}
        <div className="shrink-0 w-[240px] flex flex-col gap-2">
          {hovered ? (
            <>
              <img
                src={hovered.src}
                alt="preview"
                className="w-full rounded-[6px] object-cover shadow-md"
                style={{ aspectRatio: "1 / 1" }}
              />
              <div
                className="text-[10px] leading-[1.6] text-[#555] bg-white border border-[#e0ddd6] rounded-[6px] px-3 py-2"
                style={mono}
              >
                <div><span className="text-[#867f6f]">event</span> · {hovered.sitLabel}</div>
                <div><span className="text-[#867f6f]">variant</span> · {hovered.rowLabel}</div>
                <div><span className="text-[#867f6f]">seed</span> · {String(hovered.seed).padStart(2, "0")}</div>
                <div className="text-[#a39d8e] mt-1">click thumbnail for full screen</div>
              </div>
            </>
          ) : (
            <div
              className="w-full flex items-center justify-center text-center text-[9px] text-[#a39d8e] border border-dashed border-[#d0cdc6] rounded-[6px] px-3"
              style={{ ...mono, aspectRatio: "1 / 1" }}
            >
              hover any thumbnail to preview it larger here
            </div>
          )}
        </div>
      </div>

      <p className="text-[8px] text-[#a39d8e]" style={mono}>
        each row's 9 images are the most mutually different of 50 generated seeds (DINOv2
        farthest-point sampling, not cherry-picked) — hover to preview, click to enlarge
      </p>
    </div>
  );
}

export function Layer2() {
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
  return (
    <Section
      id="l2"
      badge={{ label: "Layer 2", variant: "l2" }}
      title="The prior — what fills the gap"
      question="What does SD generate before your prompt does anything?"
      explanation="The modality gap creates a void that the model fills with its own learned prior — a weighted average of everything in its training distribution. Generating with an empty prompt forces this prior into the open, revealing the model's default visual world before any semantic steering takes place. The CFG experiment then makes a counterintuitive point: turning the prompt's influence up or down barely changes the demographic outcome. The assumption is not a function of guidance strength — it lives in the prior itself."
    >
      <PlanNote
        purpose="Show the prior that fills the gap — and that the guidance knob can't tune it away."
        computed={`prompt="" batch (30 seeds) for the raw prior. CFG stability: DINOv2 distance from each situation's default to its country variant, recomputed at all 5 CFG levels the cultural run already swept (54 prompts × 5 CFG × 50 seeds — no new generation).`}
        useful="Kills the most common intuition: 'I'll just tweak the settings.' The assumption precedes the prompt."
        interaction="Pick an event and a country — the distance bars barely move past cfg=4."
      />
      <ToolsGrid cols={2}>
        <ToolCard
          num="04"
          name="Empty-prompt generation"
          type="Static image"
          description={`Generated with prompt="" — the model's global prior with zero semantic conditioning. Guidance has no effect here (cond = uncond), so what appears is purely the learned default.`}
          explanation="Without any prompt, the U-Net denoises from pure Gaussian noise using only its unconditional path. The resulting images are a direct read of the statistical center of the model's training distribution — they reveal which visual patterns the model considers most probable in the absence of any instruction. Shown as a 30-seed batch, not a single image, so the default is a distribution too."
        >
          <EmptyPrompt />
        </ToolCard>

        <ToolCard
          num="05"
          name="CFG stability — the knob that doesn't help"
          type="Interactive"
          description="Pick an event and a country. The image strip shows the default variant across five guidance scales; the bars show the real DINOv2 distance from that default to the country-qualified variant, at each CFG level, n=50 seeds."
          explanation="A natural intuition says stronger guidance means the prompt 'wins' over the prior — more conditioning, more of what you asked for. The distance curve shows otherwise: the cultural gap opens almost entirely by cfg=4 and barely moves from there to cfg=15. Guidance strength is not adding cultural detail proportionally — most of the gap is already fixed at low guidance, which reads as the assumption being memorized into the prior rather than assembled fresh under stronger conditioning. This is the same CFG-independence argument as the demographic case, now made with the model's own cultural-default data instead of a placeholder."
          fullWidth
        >
          <CFGCulturalStrip />
        </ToolCard>

        <ToolCard
          num="05c"
          name="Cultural prior matrix — the default has a country too"
          type="Interactive"
          description="Pick an event. Each row (default + 8 countries) shows its 9 most mutually different generations — the spread of that variant's prior, not a cherry-picked pair."
          explanation="Same logic as the empty-prompt prior, applied to the cultural axis: even before any country is named, 'a wedding' already samples from a narrow, Western-coded region of the prior. Farthest-point sampling on DINOv2 embeddings picks the seeds least like each other within a variant, so the row shows genuine variation, not near-duplicates — if a row still looks visually uniform despite being the most-diverse subset available, that itself is evidence of a tight prior."
          fullWidth
        >
          <CulturalPriorMatrix onZoom={setZoomedSrc} />
        </ToolCard>
      </ToolsGrid>
      {zoomedSrc && <Lightbox src={zoomedSrc} onClose={() => setZoomedSrc(null)} />}
    </Section>
  );
}
