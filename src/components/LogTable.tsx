"use client";

import type { SyncLogRow } from "@/lib/supabase";

export default function LogTable({ logs }: { logs: SyncLogRow[] }) {
  if (logs.length === 0) {
    return (
      <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-card-hover flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground mb-1">ログがありません</p>
        <p className="text-xs text-muted">同期を実行するとアクション履歴がここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">時刻</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">アクション</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">予定</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {logs.map((log, i) => (
              <tr
                key={log.id}
                className="hover:bg-card-hover/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <td className="px-4 py-3 text-xs text-muted tabular-nums whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    log.action.includes("delete") || log.action.includes("削除")
                      ? "text-red-400"
                      : log.action.includes("copy") || log.action.includes("コピー")
                      ? "text-blue-400"
                      : "text-muted-foreground"
                  }`}>
                    {log.action === "deleted" && "🗑 削除"}
                    {log.action === "copied" && "📋 コピー"}
                    {log.action === "delete_failed" && "🗑 削除失敗"}
                    {log.action === "copy_failed" && "📋 コピー失敗"}
                    {!["deleted", "copied", "delete_failed", "copy_failed"].includes(log.action) && log.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium truncate max-w-[200px]">{log.event_title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(log.event_start).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                    log.status === "success"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      log.status === "success" ? "bg-green-400" : "bg-red-400"
                    }`} />
                    {log.status === "success" ? "成功" : "エラー"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
