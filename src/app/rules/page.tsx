"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncRuleRow } from "@/lib/supabase";
import RuleCard from "@/components/RuleCard";
import AddRuleModal from "@/components/AddRuleModal";
import { Button } from "@/components/ui/Button";
import { Layers, Plus } from "lucide-react";

export default function RulesPage() {
  const [rules, setRules] = useState<SyncRuleRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/rules");
    if (res.ok) setRules(await res.json());
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

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

  return (
    <div className="animate-in w-full min-h-screen p-10 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between pb-6 border-b-2 border-slate-200/60">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <Layers size={24} />
            </div>
            同期ルール管理
          </h1>
          <p className="mt-3 text-sm font-bold text-slate-500">カレンダー間の同期ルールを設定・管理します</p>
        </div>
        <Button
          variant="secondary"
          icon={<Plus size={18} />}
          onClick={() => setShowAdd(true)}
        >
          新規ルール作成
        </Button>
      </header>

      {rules.length === 0 ? (
        <div className="glass-card rounded-3xl p-16 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
          <div className="w-24 h-24 bg-blue-50/50 rounded-full flex items-center justify-center mb-6 border border-blue-100">
            <Layers size={40} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">ルールが未設定です</h2>
          <p className="text-[15px] font-medium text-slate-500 mb-6 max-w-md">右上から新しいカレンダー同期ルールを作成して、自動化を始めましょう。</p>
          <Button onClick={() => setShowAdd(true)}>
            ルールを作成する
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {rules.map((rule) => (
            <div key={rule.id} className="transform hover:scale-[1.01] transition-transform">
              <RuleCard
                rule={rule}
                onToggle={() => toggleRule(rule.id, rule.enabled)}
                onDelete={() => deleteRule(rule.id)}
              />
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddRuleModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); fetchRules(); }}
        />
      )}
    </div>
  );
}
