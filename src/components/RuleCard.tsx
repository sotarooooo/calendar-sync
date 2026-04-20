"use client";

import React from "react";
import type { SyncRuleRow } from "@/lib/supabase";
import { ArrowRight, Trash2, Copy, Eraser, LucideIcon } from "lucide-react";

type ActionType = SyncRuleRow["action"];

const PROVIDERS: Record<string, { label: string; color: string }> = {
  timetree: { label: "TimeTree", color: "text-emerald-600 bg-emerald-50 ring-emerald-100" },
  google_calendar: { label: "Google Calendar", color: "text-blue-600 bg-blue-50 ring-blue-100" },
};

const ACTIONS: Record<ActionType, { label: string; style: string; icon: LucideIcon }> = {
  delete_overlap: { label: "重複削除", style: "text-rose-600 bg-rose-50 ring-rose-100", icon: Eraser },
  copy: { label: "コピー", style: "text-indigo-600 bg-indigo-50 ring-indigo-100", icon: Copy },
};

export interface RuleCardProps {
  rule: SyncRuleRow;
  onToggle: () => void;
  onDelete: () => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({ rule, onToggle, onDelete }) => {
  const act = ACTIONS[rule.action] ?? { label: rule.action, style: "text-slate-600 bg-slate-50 ring-slate-100", icon: Copy as LucideIcon };
  const source = PROVIDERS[rule.source_provider] ?? { label: rule.source_provider, color: "text-slate-600 bg-slate-50 ring-slate-100" };
  const target = PROVIDERS[rule.target_provider] ?? { label: rule.target_provider, color: "text-slate-600 bg-slate-50 ring-slate-100" };

  const ActionIcon = act.icon;

  return (
    <div className={`glass-card rounded-2xl px-5 py-4 flex items-center gap-4 text-[13px] ${!rule.enabled ? "opacity-60 grayscale-[0.3]" : ""}`}>
      {/* iOS-like Toggle Switch */}
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full flex-shrink-0 relative transition-all duration-300 ease-in-out shadow-inner ${rule.enabled ? "bg-blue-500" : "bg-slate-200"}`}
      >
        <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out ${rule.enabled ? "left-[22px]" : "left-[2px]"}`} />
      </button>

      {/* Provider Details */}
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-md text-[12px] font-semibold ring-1 shadow-sm ${source.color}`}>
          {source.label}
        </span>
        <ArrowRight size={14} className="text-slate-300 mx-1" />
        <span className={`px-2.5 py-1 rounded-md text-[12px] font-semibold ring-1 shadow-sm ${target.color}`}>
          {target.label}
        </span>
      </div>

      <div className="flex-1" />

      {/* Action Badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium ring-1 shadow-sm ${act.style}`}>
        <ActionIcon size={14} />
        {act.label}
      </div>

      <div className="flex flex-col items-center justify-center px-4 border-l border-slate-100">
        <span className="text-[10px] text-slate-400 font-medium mb-0.5">先読み</span>
        <span className="text-[13px] text-slate-700 font-bold tabular-nums leading-none">{rule.look_ahead_days}日</span>
      </div>

      <button onClick={onDelete} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group">
        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

export default RuleCard;
