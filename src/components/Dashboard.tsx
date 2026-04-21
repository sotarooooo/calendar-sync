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
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="h-12 border-b border-neutral-200 flex items-center justify-between px-6 bg-white">
        <span className="text-[13px] text-neutral-500">ダッシュボード</span>
        <button
          onClick={handleSync}
          disabled={syncing || rules.length === 0}
          className="h-7 px-3 bg-blue-600 text-white text-[12px] font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {syncing ? "同期中..." : "同期を実行"}
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="ルール数" value={rules.length} accent={activeRules > 0} />
          <StatCard label="有効" value={activeRules} accent={activeRules > 0} />
          <StatCard label="成功" value={successCount} />
          <StatCard label="エラー" value={errorCount} error={errorCount > 0} />
        </div>

        {/* Last sync */}
        {lastSync && (
          <p className="text-[11px] text-neutral-400">
            最終同期: {new Date(lastSync).toLocaleString("ja-JP")}
          </p>
        )}

        {/* Rules section */}
        <section id="rules">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-neutral-900">同期ルール</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="h-7 px-2.5 border border-neutral-300 text-[12px] font-medium rounded-md hover:bg-neutral-100 transition-colors"
            >
              + 追加
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-8 text-center">
              <p className="text-[13px] text-neutral-500">ルールがありません</p>
              <p className="text-[11px] text-neutral-400 mt-1">「+ 追加」からルールを作成</p>
            </div>
          ) : (
            <div className="space-y-1.5">
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

        {/* Logs section */}
        <section id="logs">
          <h2 className="text-[13px] font-semibold text-neutral-900 mb-3">ログ</h2>
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

function StatCard({ label, value, accent, error }: { label: string; value: number; accent?: boolean; error?: boolean }) {
  let valueColor = "text-neutral-900";
  if (accent) valueColor = "text-blue-600";
  if (error) valueColor = "text-red-600";

  return (
    <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3">
      <p className="text-[11px] text-neutral-400 mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}
