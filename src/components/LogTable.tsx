"use client";

import React from "react";
import type { SyncLogRow } from "@/lib/supabase";
import { CheckCircle2, XCircle, Trash2, Copy, AlertCircle, LucideIcon } from "lucide-react";

type ActionType = "deleted" | "copied" | "delete_failed" | "copy_failed";

const ACTION_MAP: Record<ActionType, { label: string; icon: LucideIcon; color: string }> = {
  deleted: { label: "削除", icon: Trash2, color: "text-rose-500 bg-rose-50" },
  copied: { label: "コピー", icon: Copy, color: "text-blue-500 bg-blue-50" },
  delete_failed: { label: "削除失敗", icon: AlertCircle, color: "text-amber-500 bg-amber-50" },
  copy_failed: { label: "コピー失敗", icon: AlertCircle, color: "text-amber-500 bg-amber-50" },
};

export interface LogTableProps {
  logs: SyncLogRow[];
}

export const LogTable: React.FC<LogTableProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-slate-400" />
        </div>
        <p className="text-[14px] font-semibold text-slate-700">ログがありません</p>
        <p className="text-[12px] text-slate-500 mt-1">同期を実行すると、ここに履歴が表示されます</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden text-[13px]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200/50 backdrop-blur-sm">
            <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">時刻</th>
            <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">操作</th>
            <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">予定名</th>
            <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-right">結果</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/50">
          {logs.map((log) => {
            const actionInfo = ACTION_MAP[log.action as ActionType] ?? { label: log.action, icon: AlertCircle as LucideIcon, color: "text-slate-500 bg-slate-50" };
            const ActionIcon = actionInfo.icon;
            return (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3 text-[12px] text-slate-500 tabular-nums whitespace-nowrap font-medium">
                  {new Date(log.created_at).toLocaleString("ja-JP", {
                    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-3">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${actionInfo.color}`}>
                    <ActionIcon size={12} />
                    {actionInfo.label}
                  </div>
                </td>
                <td className="px-5 py-3 w-full">
                  <p className="text-[13px] font-medium text-slate-800 truncate max-w-[300px]">{log.event_title}</p>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {log.status === "success" ? (
                    <div className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-inset ring-emerald-500/20">
                      <CheckCircle2 size={14} />
                      成功
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[12px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full ring-1 ring-inset ring-rose-500/20">
                      <XCircle size={14} />
                      エラー
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LogTable;
