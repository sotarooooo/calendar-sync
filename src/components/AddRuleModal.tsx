"use client";

import { useState } from "react";

const PROVIDERS = [
  { value: "timetree", label: "TimeTree" },
  { value: "google_calendar", label: "Google Calendar" },
];

const ACTIONS = [
  { value: "delete_overlap", label: "重複を削除", desc: "同期元に予定がある時間帯の、同期先の自分の予定を削除" },
  { value: "copy", label: "予定をコピー", desc: "同期元の予定を同期先にそのままコピー" },
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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">ルールを追加</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1.5">同期元</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border border-input-border rounded-md px-2.5 py-2 text-[13px] bg-card focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1.5">同期先</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full border border-input-border rounded-md px-2.5 py-2 text-[13px] bg-card focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1.5">アクション</label>
            <div className="space-y-1.5">
              {ACTIONS.map((a) => (
                <label
                  key={a.value}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                    action === a.value ? "border-accent bg-accent-light" : "border-border hover:bg-card-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="action"
                    value={a.value}
                    checked={action === a.value}
                    onChange={(e) => setAction(e.target.value)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <p className="text-[13px] font-medium">{a.label}</p>
                    <p className="text-[11px] text-muted mt-0.5">{a.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1.5">先読み日数: {days}日</label>
            <input
              type="range"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-accent h-1.5"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1日</span>
              <span>90日</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 text-[12px] font-medium text-muted hover:text-foreground transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 bg-accent text-white text-[12px] font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {submitting ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
