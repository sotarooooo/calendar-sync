"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncRuleRow, SyncLogRow } from "@/lib/supabase";
import RuleCard from "./RuleCard";
import AddRuleModal from "./AddRuleModal";
import LogTable from "./LogTable";

export default function Dashboard() {
  const [rules, setRules] = useState<SyncRuleRow[]>([]);
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/rules");
    if (res.ok) setRules(await res.json());
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/logs");
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
      if (data.length > 0) setLastSync(data[0].created_at);
    }
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
      setLastSync(new Date().toISOString());
    } finally {
      setSyncing(false);
    }
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

  const activeRules = rules.filter((r) => r.enabled).length;
  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
        <h1 className="text-[13px] font-medium text-muted">ダッシュボード</h1>
        <button
          onClick={handleSync}
          disabled={syncing || rules.length === 0}
          className="inline-flex items-center gap-1.5 h-8 px-3 bg-accent text-white text-[12px] font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          {syncing ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {syncing ? "同期中..." : "同期を実行"}
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 animate-fade-in">
          <StatCard label="ルール" value={String(rules.length)} sub={`${activeRules} 有効`} color="accent" />
          <StatCard label="成功" value={String(successCount)} sub="アクション" color="success" />
          <StatCard label="エラー" value={String(errorCount)} sub="アクション" color={errorCount > 0 ? "error" : "muted"} />
          <StatCard
            label="最終同期"
            value={lastSync ? new Date(lastSync).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "—"}
            sub={lastSync ? new Date(lastSync).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) : "未実行"}
            color="muted"
          />
        </div>

        {/* Rules */}
        <section id="rules">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold">同期ルール</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 h-7 px-2.5 border border-border text-[12px] font-medium rounded-md hover:bg-card-hover transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              追加
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <p className="text-[13px] text-muted">ルールがありません</p>
              <p className="text-[11px] text-muted-foreground mt-1">「追加」から同期ルールを作成してください</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={() => toggleRule(rule.id, rule.enabled)}
                  onDelete={() => deleteRule(rule.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Logs */}
        <section id="logs">
          <h2 className="text-[13px] font-semibold mb-3">ログ</h2>
          <LogTable logs={logs} />
        </section>
      </div>

      {showAdd && (
        <AddRuleModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); fetchRules(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const dotColor = {
    accent: "bg-accent",
    success: "bg-success",
    error: "bg-error",
    muted: "bg-muted-foreground",
  }[color] ?? "bg-muted-foreground";

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <p className="text-[11px] text-muted font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
