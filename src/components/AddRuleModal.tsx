"use client";

import React, { useState } from "react";
import type { SyncRuleRow } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { X, Save, CalendarDays, Zap, Copy, Eraser } from "lucide-react";

const PROVIDERS = [
  { value: "timetree", label: "TimeTree" },
  { value: "google_calendar", label: "Google Calendar" },
] as const;

type ProviderType = typeof PROVIDERS[number]["value"];
type ActionType = SyncRuleRow["action"];

export interface AddRuleModalProps {
  onClose: () => void;
  onCreated: () => void;
  initialRule?: SyncRuleRow;
}

export const AddRuleModal: React.FC<AddRuleModalProps> = ({ onClose, onCreated, initialRule }) => {
  const [source, setSource] = useState<string>(initialRule?.source_provider || "timetree");
  const [target, setTarget] = useState<string>(initialRule?.target_provider || "google_calendar");
  const [action, setAction] = useState<ActionType>(initialRule?.action || "delete_overlap");
  const [days, setDays] = useState<number>(initialRule?.look_ahead_days || 14);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [gCalendars, setGCalendars] = useState<{id: string, name: string}[]>([]);
  const [tCalendars, setTCalendars] = useState<{id: number, name: string}[]>([]);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/calendars/google").then(r => r.ok ? r.json() : []),
      fetch("/api/calendars/timetree").then(r => r.ok ? r.json() : [])
    ])
    .then(([gcData, ttData]) => {
      if (Array.isArray(gcData)) {
        setGCalendars(gcData);
        if (gcData.length > 0 && !initialRule?.target_provider) {
          setTarget(`google_calendar:${gcData[0].id}`);
        }
      }
      if (Array.isArray(ttData)) {
        setTCalendars(ttData);
        // 旧形式("timetree")からのアップグレード、または新規作成時の初期値セット
        if (ttData.length > 0) {
          if (!initialRule?.source_provider || initialRule.source_provider === "timetree") {
            setSource(`timetree:${ttData[0].id}`);
          }
        }
      }
    })
    .catch(console.error);
  }, [initialRule]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Partial<SyncRuleRow> = {
        source_provider: source,
        target_provider: target,
        action,
        look_ahead_days: days,
      };
      
      if (initialRule) {
        payload.id = initialRule.id;
      }
      
      const method = initialRule ? "PATCH" : "POST";

      const res = await fetch("/api/rules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) onCreated();
    } catch (error) {
      console.error("Failed to create rule:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center isolate">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <Card variant="glass" className="relative shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in text-[13px] border-white/50">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <Zap size={18} className="text-blue-500" />
            <h3 className="font-bold text-[15px]">{initialRule ? "ルールを編集" : "新しい同期ルールを作成"}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays size={12} />
                同期元
              </span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm outline-none"
              >
                {tCalendars.length === 0 ? (
                  <option value="timetree">TimeTree (読込中...)</option>
                ) : (
                  tCalendars.map((cal) => (
                    <option key={cal.id} value={`timetree:${cal.id}`}>TimeTree: {cal.name}</option>
                  ))
                )}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays size={12} />
                同期先
              </span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm outline-none"
              >
                {gCalendars.length === 0 ? (
                  <option value="google_calendar">Google Calendar (読込中...)</option>
                ) : (
                  gCalendars.map((cal) => (
                    <option key={cal.id} value={`google_calendar:${cal.id}`}>Google: {cal.name}</option>
                  ))
                )}
              </select>
            </label>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">実行するアクション</span>
            <div className="grid grid-cols-2 gap-3">
              <label className={`relative flex flex-col gap-1.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${action === "delete_overlap" ? "border-blue-500 bg-blue-50/50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                <input type="radio" name="action" value="delete_overlap" checked={action === "delete_overlap"} onChange={(e) => setAction(e.target.value as ActionType)} className="sr-only" />
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${action === "delete_overlap" ? "border-blue-500" : "border-slate-300"}`}>
                    {action === "delete_overlap" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5"><Eraser size={14} className="text-rose-500" /> 重複を削除</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">同期元と同時間帯の同期先の予定を削除します。</p>
              </label>

              <label className={`relative flex flex-col gap-1.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${action === "copy" ? "border-blue-500 bg-blue-50/50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                <input type="radio" name="action" value="copy" checked={action === "copy"} onChange={(e) => setAction(e.target.value as ActionType)} className="sr-only" />
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${action === "copy" ? "border-blue-500" : "border-slate-300"}`}>
                    {action === "copy" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5"><Copy size={14} className="text-indigo-500" /> 予定をコピー</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">同期元の予定を同期先の世界に完全に複製します。</p>
              </label>
            </div>
          </div>

          <label className="block bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-slate-700">先読み日数</span>
              <span className="px-2 py-0.5 rounded-md bg-white text-blue-600 font-bold text-[12px] shadow-sm border border-slate-100">{days}日間</span>
            </div>
            <input type="range" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-slate-400 font-medium">1日</span>
              <span className="text-[10px] text-slate-400 font-medium">90日</span>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              icon={
                submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )
              }
            >
              {submitting ? "保存中..." : (initialRule ? "変更を保存" : "ルールを作成")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddRuleModal;
