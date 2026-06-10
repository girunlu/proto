import { ReactNode, useState } from "react";

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
