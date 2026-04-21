"use client";

import { useState } from "react";

const PROVIDERS = [
  { value: "timetree", label: "TimeTree" },
  { value: "google_calendar", label: "Google Calendar" },
];

export default function AddRuleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [source, setSource] = useState("timetree");
  const [target, setTarget] = useState("google_calendar");
  const [action, setAction] = useState("delete_overlap");
  const [days, setDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_provider: source,
          target_provider: target,
          action,
          look_ahead_days: days,
        }),
      });
      if (res.ok) onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white border border-neutral-200 rounded-xl shadow-lg w-full max-w-sm animate-slide-up text-[13px]">
        <div className="px-5 py-3 border-b border-neutral-200">
          <h3 className="font-semibold text-neutral-900">ルールを追加</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-neutral-500 mb-1 block">同期元</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-neutral-500 mb-1 block">同期先</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 mb-1.5 block">アクション</span>
            <div className="space-y-1.5">
              <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${action === "delete_overlap" ? "border-blue-500 bg-blue-50" : "border-neutral-200"}`}>
                <input type="radio" name="action" value="delete_overlap" checked={action === "delete_overlap"} onChange={(e) => setAction(e.target.value)} className="accent-blue-600" />
                <div>
                  <p className="font-medium">重複を削除</p>
                  <p className="text-[11px] text-neutral-400">同期元と被る同期先の予定を削除</p>
                </div>
              </label>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${action === "copy" ? "border-blue-500 bg-blue-50" : "border-neutral-200"}`}>
                <input type="radio" name="action" value="copy" checked={action === "copy"} onChange={(e) => setAction(e.target.value)} className="accent-blue-600" />
                <div>
                  <p className="font-medium">予定をコピー</p>
                  <p className="text-[11px] text-neutral-400">同期元の予定を同期先にコピー</p>
                </div>
              </label>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] text-neutral-500 mb-1 block">先読み日数: {days}日</span>
            <input type="range" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-blue-600" />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-7 px-3 text-[12px] text-neutral-500 hover:text-neutral-900">
              キャンセル
            </button>
            <button type="submit" disabled={submitting} className="h-7 px-4 bg-blue-600 text-white text-[12px] font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
