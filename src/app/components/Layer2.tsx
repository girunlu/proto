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

function CFGCulturalStrip() {
  const [sitId, setSitId] = useState("wedding");
  const [country, setCountry] = useState("NG");
  const [cfgIdx, setCfgIdx] = useState(2); // default to cfg=7
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  const rows = CFG_VALUES.map((cfg) => CFG_DISTANCE[sitId]?.[country]?.[String(cfg)]);
  const maxDist = Math.max(...rows.map((r) => r?.mean ?? 0), 0.01);

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] text-[#8a8374] shrink-0" style={mono}>event:</span>
        <select
          value={sitId}
          onChange={(e) => setSitId(e.target.value)}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={mono}
        >
          {CFG_SITUATIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <span className="text-[9px] text-[#8a8374] shrink-0 ml-2">vs default in:</span>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="text-[10px] border border-[#d8d4cb] rounded-[4px] px-[6px] py-[3px] bg-white"
          style={mono}
        >
          {CFG_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>

      {/* Illustration: default-variant image strip across CFG (single seed) */}
      <div className="flex gap-[5px]">
        {CFG_VALUES.map((cfg, i) => (
          <button
            key={cfg}
            onClick={() => setCfgIdx(i)}
            className="flex-1 flex flex-col gap-[4px] cursor-pointer bg-transparent border-0 p-0"
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
        ))}
      </div>
      <p className="text-[8px] text-[#a39d8e]" style={mono}>
        default variant · seed 00 · illustration only — the bars below are the evidence
      </p>

      {/* Evidence: DINOv2 distance from default, per CFG level */}
      <div className="flex flex-col gap-[6px] mt-1">
        {CFG_VALUES.map((cfg, i) => {
          const r = rows[i];
          const pct = r ? r.mean / maxDist : 0;
          return (
            <div key={cfg} className="flex items-center gap-2">
              <span
                className="text-[9px] w-[46px] text-right shrink-0 cursor-pointer"
                style={{ ...mono, color: cfgIdx === i ? "#92400e" : "#867f6f", fontWeight: cfgIdx === i ? 600 : 400 }}
                onClick={() => setCfgIdx(i)}
              >
                cfg={cfg}
              </span>
              <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
                <div
                  className="h-full rounded-[3px] transition-all duration-500"
                  style={{ width: `${pct * 100}%`, background: "#34d399" }}
                />
              </div>
              <span className="text-[9px] text-[#867f6f] w-[36px] shrink-0" style={mono}>
                {r ? r.mean.toFixed(2) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={mono}>
        bars = DINOv2 cosine distance between "{CFG_SITUATIONS.find(s=>s.id===sitId)?.label}" and
        the {CFG_COUNTRIES.find(c=>c.code===country)?.label}-qualified variant, n=50 seeds per CFG
        level (evidence) · note the distance is set almost entirely by cfg=4, then barely moves
        through cfg=15 — guidance strength sharpens the assumption, it does not add it
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
