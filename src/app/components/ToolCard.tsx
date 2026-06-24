import { ReactNode, useState, useEffect } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ─── Lightbox ────────────────────────────────────────────────────────────────

export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10,10,8,0.88)" }}
      onClick={onClose}
    >
      <img
        src={src}
        alt="zoomed"
        className="rounded-[10px] shadow-2xl"
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="absolute top-5 right-6 text-[22px] leading-none transition-opacity"
        style={{ color: "rgba(255,255,255,0.55)" }}
        onClick={onClose}
      >
        ✕
      </button>
      <span
        className="absolute bottom-5 text-[9px]"
        style={{ color: "rgba(255,255,255,0.35)", ...MONO }}
      >
        click anywhere or press ESC to close
      </span>
    </div>
  );
}

// ─── PredictionReveal ────────────────────────────────────────────────────────
// Shows a question + options before revealing content.
// onReveal(picked) is called when user confirms — use it to set shared state.

interface PredictionRevealProps {
  question: string;
  options: { id: string; label: string }[];
  onReveal: (picked: string) => void;
  children: ReactNode;
}

export function PredictionReveal({ question, options, onReveal, children }: PredictionRevealProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const confirm = () => {
    if (!picked) return;
    onReveal(picked);
    setRevealed(true);
  };

  if (revealed) {
    const pickedLabel = options.find((o) => o.id === picked)?.label ?? picked;
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex items-center gap-2 text-[10px] text-[#867f6f] border border-dashed border-[#d0cdc6] rounded-[6px] px-3 py-2 self-start"
          style={MONO}
        >
          <span style={{ color: "#34d399" }}>✓</span>
          you predicted: <b style={{ color: "#1a1a1a" }}>{pickedLabel}</b>
          <span className="text-[#a39d8e]">— see how it compares below</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="border border-dashed border-[#d0cdc6] rounded-[10px] bg-[#fbfaf6] p-5 flex flex-col gap-4 max-w-[680px]">
      <p className="text-[13px] text-[#444] leading-[1.6]">{question}</p>
      <div className="flex gap-[6px] flex-wrap">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setPicked(o.id)}
            className="text-[11px] px-[12px] py-[5px] rounded-[5px] border transition-colors"
            style={{
              ...MONO,
              background: picked === o.id ? "#064e3b" : "#f5f4f0",
              color: picked === o.id ? "#d1fae5" : "#555",
              borderColor: picked === o.id ? "#064e3b" : "#d0cdc6",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {picked && (
        <button
          onClick={confirm}
          className="self-start text-[11px] px-[14px] py-[6px] rounded-[5px] transition-colors"
          style={{ background: "#064e3b", color: "#d1fae5", ...MONO }}
        >
          see what SD actually generates →
        </button>
      )}
    </div>
  );
}

interface ToolCardProps {
  num: string;
  name: string;
  type: string;
  description: string;
  explanation?: string;
  children: ReactNode;
  fullWidth?: boolean;
}

export function ToolCard({ num, name, type, description, explanation, children, fullWidth }: ToolCardProps) {
  return (
    <div
      style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}
      className="bg-white border border-[#e0ddd6] rounded-[10px] overflow-hidden"
    >
      <div className="px-[18px] pt-[14px] pb-[10px] border-b border-[#f0ede6] flex items-center gap-[10px]">
        <span
          className="text-[10px] font-semibold text-[#867f6f] min-w-[20px]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {num}
        </span>
        <span className="text-[13px] font-medium text-[#1a1a1a]">{name}</span>
        <span
          className="ml-auto text-[10px] text-[#888] bg-[#f5f4f0] px-[7px] py-[2px] rounded-[3px] whitespace-nowrap"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {type}
        </span>
      </div>
      <div className="px-[18px] pt-[10px] pb-[2px] text-[12px] text-[#666] leading-[1.55]">{description}</div>
      {explanation && (
        <div className="px-[18px] pt-[6px] pb-[10px] text-[11px] text-[#888] leading-[1.6] border-t border-dashed border-[#f0ede6] mt-[8px]">
          {explanation}
        </div>
      )}
      <div className="mx-[18px] mb-[14px] mt-[8px] bg-[#f9f8f5] border border-dashed border-[#d0cdc6] rounded-[6px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface LayerBadgeProps {
  label: string;
  variant: "l1" | "l2" | "l3a" | "l3b" | "l3c" | "l4" | "l5";
}

// ─── PlanNote — collapsible "how & why" box under each section ──────────────

interface PlanNoteProps {
  purpose: string;
  computed: string;
  useful: string;
  interaction: string;
}

export function PlanNote({ purpose, computed, useful, interaction }: PlanNoteProps) {
  const [open, setOpen] = useState(false);
  const rows: [string, string][] = [
    ["purpose", purpose],
    ["computation", computed],
    ["why it helps", useful],
    ["interaction", interaction],
  ];
  return (
    <div className="mb-8 max-w-[860px] border border-dashed border-[#d8d4cb] rounded-[8px] bg-[#fbfaf6] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-[9px] text-[11px] text-[#888] hover:text-[#1a1a1a] transition-colors flex items-center gap-2"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <span className="text-[9px] w-[10px]">{open ? "▼" : "▶"}</span>
        section plan — purpose · computation · usefulness · interaction
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-col gap-[10px]">
          {rows.map(([label, text]) => (
            <div key={label} className="flex gap-3 text-[12px] leading-[1.6]">
              <span
                className="w-[110px] shrink-0 text-[9px] uppercase tracking-[0.06em] text-[#867f6f] pt-[3px]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {label}
              </span>
              <span className="text-[#555]">{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const badgeStyles: Record<LayerBadgeProps["variant"], { bg: string; color: string }> = {
  l1: { bg: "#ede9fe", color: "#4c1d95" },
  l2: { bg: "#fef3c7", color: "#78350f" },
  l3a: { bg: "#fce7f3", color: "#831843" },
  l3b: { bg: "#d1fae5", color: "#064e3b" },
  l3c: { bg: "#dbeafe", color: "#1e3a5f" },
  l4: { bg: "#ffedd5", color: "#7c2d12" },
  l5: { bg: "#e0f2fe", color: "#0c4a6e" },
};

export function LayerBadge({ label, variant }: LayerBadgeProps) {
  const { bg, color } = badgeStyles[variant];
  return (
    <span
      className="text-[10px] font-semibold tracking-[0.1em] uppercase px-[8px] py-[3px] rounded-[3px]"
      style={{ background: bg, color, fontFamily: "'JetBrains Mono', monospace" }}
    >
      {label}
    </span>
  );
}

interface SectionProps {
  id: string;
  badge: { label: string; variant: LayerBadgeProps["variant"] };
  title: string;
  question: string;
  explanation?: string;
  bg?: string;
  children: ReactNode;
}

export function Section({ id, badge, title, question, explanation, bg = "#fff", children }: SectionProps) {
  return (
    <div id={id} style={{ background: bg }} className="py-16 px-12 border-b border-[#e0ddd6]">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-baseline gap-4 mb-2">
          <LayerBadge label={badge.label} variant={badge.variant} />
          <h2
            className="text-[22px] font-medium text-[#1a1a1a]"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            {title}
          </h2>
        </div>
        <p
          className="text-[13px] text-[#888] mb-3 italic"
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
        >
          {question}
        </p>
        {explanation && (
          <p className="text-[14px] text-[#555] leading-[1.7] mb-8 max-w-[760px]">
            {explanation}
          </p>
        )}
        {!explanation && <div className="mb-8" />}
        {children}
      </div>
    </div>
  );
}

export function SubsectionLabel({ children, explanation }: { children: ReactNode; explanation?: string }) {
  return (
    <div className="mt-9 mb-4">
      <div
        className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#867f6f] pb-2 border-b border-[#e8e5de]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {children}
      </div>
      {explanation && (
        <p className="text-[13px] text-[#666] leading-[1.65] mt-3 max-w-[720px]">{explanation}</p>
      )}
    </div>
  );
}

export function ToolsGrid({
  cols = 2,
  children,
}: {
  cols?: 1 | 2 | 3;
  children: ReactNode;
}) {
  const gridCols = { 1: "grid-cols-1", 2: "grid-cols-1 md:grid-cols-2", 3: "grid-cols-1 md:grid-cols-3" }[cols];
  return <div className={`grid gap-5 ${gridCols}`}>{children}</div>;
}
