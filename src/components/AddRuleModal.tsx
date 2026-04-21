"use client";

import { useState } from "react";

const PROVIDERS = [
  { value: "timetree", label: "TimeTree" },
  { value: "google_calendar", label: "Google Calendar" },
];

const ACTIONS = [
  { value: "delete_overlap", label: "重複を削除", desc: "同期元に予定があれば、同期先の同時間帯の予定を削除" },
  { value: "copy", label: "予定をコピー", desc: "同期元の予定を同期先にコピー" },
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-base font-semibold">新しい同期ルール</h3>
          <p className="text-xs text-muted mt-1">カレンダー間の同期ルールを設定します</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">同期元</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">同期先</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">アクション</label>
            <div className="space-y-2">
              {ACTIONS.map((a) => (
                <label
                  key={a.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    action === a.value
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-muted"
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
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted mt-0.5">{a.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              先読み日数 <span className="text-muted">({days}日)</span>
            </label>
            <input
              type="range"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>1日</span>
              <span>90日</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {submitting ? "作成中..." : "ルールを作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
