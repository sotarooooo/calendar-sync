"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncRuleRow, SyncLogRow } from "@/lib/supabase";
import LogTable from "@/components/LogTable";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RefreshCcw, Layers, CheckCircle, Activity, AlertTriangle, Sparkles, MoveRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [rules, setRules] = useState<SyncRuleRow[]>([]);
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [syncing, setSyncing] = useState(false);
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

  const activeRules = rules.filter((r) => r.enabled).length;
  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  return (
    <div className="animate-in w-full min-h-screen p-10 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center justify-between pb-8 border-b-2 border-slate-200/60">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
              <Sparkles size={24} />
            </div>
            Overview
          </h1>
          <p className="mt-3 text-sm font-bold text-slate-500">
            {lastSync ? `最終同期: ${new Date(lastSync).toLocaleString("ja-JP")}` : 'システムの同期サマリーと健全性を確認します'}
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleSync}
          disabled={syncing || rules.length === 0}
          icon={<RefreshCcw size={18} className={syncing ? "animate-spin" : ""} />}
        >
          {syncing ? "同期を実行中..." : "今すぐ同期する"}
        </Button>
      </header>

      {/* Stats row - Giant bold cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard label="総ルール数" value={rules.length} icon={Layers} color="blue" />
        <StatCard label="有効なルール" value={activeRules} accent={activeRules > 0} icon={Activity} color="emerald" />
        <StatCard label="同期成功" value={successCount} icon={CheckCircle} color="slate" />
        <StatCard label="エラー発生" value={errorCount} error={errorCount > 0} icon={AlertTriangle} color="rose" />
      </div>

      {/* Recent Logs Preview */}
      <Card variant="glassPadded" className="p-2 border-white">
        <div className="px-6 py-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-600">
              <Activity size={16} />
            </div>
            最近の同期ログ (プレビュー)
          </h2>
          <Button variant="ghost" size="sm" icon={<MoveRight size={16} className="order-last" />} onClick={() => window.location.href = '/logs'}>
            すべて見る
          </Button>
        </div>
        <div className="px-2 pb-2">
          <LogTable logs={logs.slice(0, 5)} />
        </div>
      </Card>
    </div>
  );
}
