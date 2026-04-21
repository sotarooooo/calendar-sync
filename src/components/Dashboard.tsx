"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncRuleRow, SyncLogRow } from "@/lib/supabase";

const PROVIDERS = [
  { value: "timetree", label: "TimeTree" },
  { value: "google_calendar", label: "Google Calendar" },
];

const ACTIONS = [
  { value: "delete_overlap", label: "重複を削除" },
  { value: "copy", label: "予定をコピー" },
];

export default function Dashboard() {
  const [rules, setRules] = useState<SyncRuleRow[]>([]);
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [formSource, setFormSource] = useState("timetree");
  const [formTarget, setFormTarget] = useState("google_calendar");
  const [formAction, setFormAction] = useState<"delete_overlap" | "copy">("delete_overlap");
  const [formDays, setFormDays] = useState(14);

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/rules");
    if (res.ok) setRules(await res.json());
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/logs");
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => {
    fetchRules();
    fetchLogs();
  }, [fetchRules, fetchLogs]);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      await fetchLogs();
    } finally {
      setSyncing(false);
    }
  }

  async function addRule() {
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_provider: formSource,
        target_provider: formTarget,
        action: formAction,
        look_ahead_days: formDays,
      }),
    });
    setShowAdd(false);
    fetchRules();
  }

  async function deleteRule(id: string) {
    await fetch("/api/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchRules();
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch("/api/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: !enabled }),
    });
    fetchRules();
  }

  function providerLabel(val: string) {
    return PROVIDERS.find((p) => p.value === val)?.label ?? val;
  }

  function actionLabel(val: string) {
    return ACTIONS.find((a) => a.value === val)?.label ?? val;
  }

  return (
    <div className="space-y-8">
      {/* Sync Rules */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">同期ルール</h2>
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing || rules.length === 0}
              className="px-4 py-2 bg-accent text-background text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {syncing ? "同期中..." : "今すぐ同期"}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-card border border-border text-sm font-semibold rounded-lg hover:bg-card-hover transition-colors"
            >
              + ルール追加
            </button>
          </div>
        </div>

        {rules.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted">
            ルールがありません。「+ ルール追加」から作成してください。
          </div>
        )}

        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-card rounded-xl border border-border p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleRule(rule.id, rule.enabled)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${
                    rule.enabled ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      rule.enabled ? "left-5" : "left-1"
                    }`}
                  />
                </button>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{providerLabel(rule.source_provider)}</span>
                    <span className="text-muted">→</span>
                    <span>{providerLabel(rule.target_provider)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span className={`px-2 py-0.5 rounded-full ${
                      rule.action === "delete_overlap"
                        ? "bg-error/15 text-error"
                        : "bg-accent/15 text-accent"
                    }`}>
                      {actionLabel(rule.action)}
                    </span>
                    <span>{rule.look_ahead_days}日先まで</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteRule(rule.id)}
                className="text-muted hover:text-error transition-colors text-sm"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Add Rule Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-5">新しい同期ルール</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">同期元</label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">同期先</label>
                <select
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">アクション</label>
                <select
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value as "delete_overlap" | "copy")}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">先読み日数</label>
                <input
                  type="number"
                  value={formDays}
                  onChange={(e) => setFormDays(Number(e.target.value))}
                  min={1}
                  max={90}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addRule}
                className="px-4 py-2 bg-accent text-background text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Logs */}
      <section>
        <h2 className="text-lg font-semibold mb-4">同期ログ</h2>

        {logs.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted">
            まだ同期ログがありません。
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted text-left">
                    <th className="px-4 py-3 font-medium">時刻</th>
                    <th className="px-4 py-3 font-medium">アクション</th>
                    <th className="px-4 py-3 font-medium">予定</th>
                    <th className="px-4 py-3 font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("ja-JP")}
                      </td>
                      <td className="px-4 py-3">{log.action}</td>
                      <td className="px-4 py-3">
                        <div>{log.event_title}</div>
                        <div className="text-xs text-muted">
                          {new Date(log.event_start).toLocaleString("ja-JP")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            log.status === "success"
                              ? "bg-success/15 text-success"
                              : "bg-error/15 text-error"
                          }`}
                        >
                          {log.status === "success" ? "成功" : "エラー"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
