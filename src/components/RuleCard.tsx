"use client";

import type { SyncRuleRow } from "@/lib/supabase";

const PROVIDERS: Record<string, string> = {
  timetree: "TimeTree",
  google_calendar: "Google Calendar",
};

const ACTIONS: Record<string, { label: string; style: string }> = {
  delete_overlap: { label: "重複削除", style: "text-red-600 bg-red-50" },
  copy: { label: "コピー", style: "text-blue-600 bg-blue-50" },
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
  const act = ACTIONS[rule.action] ?? { label: rule.action, style: "text-neutral-600 bg-neutral-50" };

  return (
    <div className={`bg-white border border-neutral-200 rounded-lg px-4 py-2.5 flex items-center gap-3 text-[13px] ${!rule.enabled ? "opacity-40" : ""}`}>
      <button
        onClick={onToggle}
        className={`w-7 h-4 rounded-full flex-shrink-0 relative transition-colors ${rule.enabled ? "bg-blue-600" : "bg-neutral-300"}`}
      >
        <span className={`absolute top-[2px] w-3 h-3 rounded-full bg-white shadow-sm transition-all ${rule.enabled ? "left-[14px]" : "left-[2px]"}`} />
      </button>

      <span className="text-neutral-900 font-medium">{PROVIDERS[rule.source_provider] ?? rule.source_provider}</span>
      <span className="text-neutral-300">→</span>
      <span className="text-neutral-900 font-medium">{PROVIDERS[rule.target_provider] ?? rule.target_provider}</span>

      <span className={`ml-auto px-1.5 py-0.5 rounded text-[11px] font-medium ${act.style}`}>
        {act.label}
      </span>

      <span className="text-[11px] text-neutral-400 tabular-nums">{rule.look_ahead_days}日</span>

      <button onClick={onDelete} className="text-neutral-300 hover:text-red-500 transition-colors text-[11px]">
        ✕
      </button>
    </div>
  );
}
