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
  const totalActions = logs.length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-8">
        <div>
          <h1 className="text-sm font-semibold">ダッシュボード</h1>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || rules.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {syncing ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              同期中...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              今すぐ同期
            </>
          )}
        </button>
      </header>

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">有効なルール</p>
              <div className={`w-2 h-2 rounded-full ${activeRules > 0 ? "bg-success" : "bg-muted"}`} style={activeRules > 0 ? { animation: "pulse-dot 2s ease-in-out infinite" } : {}} />
            </div>
            <p className="text-3xl font-semibold mt-2 tracking-tight">{activeRules}</p>
            <p className="text-xs text-muted mt-1">/ {rules.length} ルール</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">実行済みアクション</p>
            <p className="text-3xl font-semibold mt-2 tracking-tight">{totalActions}</p>
            <p className="text-xs text-muted mt-1">{errorCount > 0 ? `${errorCount} エラー` : "エラーなし"}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">最終同期</p>
            <p className="text-lg font-semibold mt-2 tracking-tight">
              {lastSync
                ? new Date(lastSync).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </p>
            <p className="text-xs text-muted mt-1">5分おきに自動実行</p>
          </div>
        </div>

        {/* Rules */}
        <section id="rules">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">同期ルール</h2>
              <p className="text-xs text-muted mt-0.5">カレンダー間の同期ルールを管理</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border text-xs font-medium rounded-lg hover:bg-card-hover transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              ルール追加
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-card-hover flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-1">ルールがありません</p>
              <p className="text-xs text-muted">「ルール追加」から同期ルールを作成してください</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div key={rule.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <RuleCard
                    rule={rule}
                    onToggle={() => toggleRule(rule.id, rule.enabled)}
                    onDelete={() => deleteRule(rule.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Logs */}
        <section id="logs">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">同期ログ</h2>
            <p className="text-xs text-muted mt-0.5">直近50件のアクション履歴</p>
          </div>
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
