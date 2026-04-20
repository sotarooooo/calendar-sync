"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncLogRow } from "@/lib/supabase";
import LogTable from "@/components/LogTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListFilter, Search, RefreshCw } from "lucide-react";

export default function LogsPage() {
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [fetching, setFetching] = useState(false);

  const fetchLogs = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        setLogs(await res.json());
      }
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="animate-in w-full min-h-screen p-10 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between pb-6 border-b-2 border-slate-200/60">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
              <ListFilter size={24} />
            </div>
            同期ログ履歴
          </h1>
          <p className="mt-3 text-sm font-bold text-slate-500">過去のすべての同期アクション結果を確認できます</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="ログを検索..." 
              className="pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold w-64 focus:border-emerald-500 focus:outline-none transition-colors"
              disabled
            />
          </div>
          <Button
            variant="ghost"
            onClick={fetchLogs}
            className="w-11 h-11 p-0 border-2 border-slate-200 bg-white"
            icon={<RefreshCw size={18} className={fetching ? "animate-spin text-emerald-500" : "text-slate-600"} />}
          />
        </div>
      </header>

      <Card variant="glassPadded" className="p-2 border-white">
        <LogTable logs={logs} />
      </Card>
    </div>
  );
}
