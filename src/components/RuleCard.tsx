"use client";

import type { SyncRuleRow } from "@/lib/supabase";

const PROVIDERS: Record<string, { label: string; color: string; bg: string }> = {
  timetree: { label: "TimeTree", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  google_calendar: { label: "Google Calendar", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
};

const ACTIONS: Record<string, { label: string; color: string; bg: string }> = {
  delete_overlap: { label: "重複削除", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  copy: { label: "コピー", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
};

export default function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: SyncRuleRow;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const src = PROVIDERS[rule.source_provider] ?? { label: rule.source_provider, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
  const tgt = PROVIDERS[rule.target_provider] ?? { label: rule.target_provider, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
  const act = ACTIONS[rule.action] ?? { label: rule.action, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };

  return (
    <div className={`bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 transition-opacity ${!rule.enabled ? "opacity-40" : ""}`}>
      <button
        onClick={onToggle}
        className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${
          rule.enabled ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all ${
            rule.enabled ? "left-[18px]" : "left-[2px]"
          }`}
        />
      </button>

      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${src.bg} ${src.color}`}>
          {src.label}
        </span>
        <svg className="w-3 h-3 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${tgt.bg} ${tgt.color}`}>
          {tgt.label}
        </span>
      </div>

      <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${act.bg} ${act.color}`}>
        {act.label}
      </span>

      <span className="text-[11px] text-muted tabular-nums">{rule.look_ahead_days}日</span>

      <button
        onClick={onDelete}
        className="p-1 rounded text-muted-foreground hover:text-error hover:bg-error-light transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
