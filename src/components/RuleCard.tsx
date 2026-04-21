"use client";

import type { SyncRuleRow } from "@/lib/supabase";

const PROVIDERS: Record<string, { label: string; icon: string; color: string }> = {
  timetree: { label: "TimeTree", icon: "🌳", color: "bg-green-500/10 text-green-400" },
  google_calendar: { label: "Google Calendar", icon: "📅", color: "bg-blue-500/10 text-blue-400" },
};

const ACTIONS: Record<string, { label: string; color: string }> = {
  delete_overlap: { label: "重複を削除", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  copy: { label: "予定をコピー", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
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
  const src = PROVIDERS[rule.source_provider] ?? { label: rule.source_provider, icon: "📎", color: "bg-muted/10 text-muted" };
  const tgt = PROVIDERS[rule.target_provider] ?? { label: rule.target_provider, icon: "📎", color: "bg-muted/10 text-muted" };
  const act = ACTIONS[rule.action] ?? { label: rule.action, color: "bg-muted/10 text-muted" };

  return (
    <div className={`bg-card border border-border rounded-xl p-4 flex items-center gap-4 transition-opacity ${!rule.enabled ? "opacity-50" : ""}`}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${
          rule.enabled ? "bg-accent" : "bg-input"
        }`}
      >
        <span
          className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all ${
            rule.enabled ? "left-[22px]" : "left-[3px]"
          }`}
        />
      </button>

      {/* Source → Target */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${src.color}`}>
          <span>{src.icon}</span>
          {src.label}
        </span>
        <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${tgt.color}`}>
          <span>{tgt.icon}</span>
          {tgt.label}
        </span>
      </div>

      {/* Action badge */}
      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${act.color}`}>
        {act.label}
      </span>

      {/* Days */}
      <span className="text-xs text-muted tabular-nums flex-shrink-0">
        {rule.look_ahead_days}日
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
