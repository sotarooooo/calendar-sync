"use client";

import type { SyncLogRow } from "@/lib/supabase";

const ACTION_LABELS: Record<string, string> = {
  deleted: "削除",
  copied: "コピー",
  delete_failed: "削除失敗",
  copy_failed: "コピー失敗",
};

export default function LogTable({ logs }: { logs: SyncLogRow[] }) {
  if (logs.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-10 text-center">
        <p className="text-[13px] text-muted">ログがありません</p>
        <p className="text-[11px] text-muted-foreground mt-1">同期を実行すると履歴が表示されます</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-sidebar-bg">
            <th className="px-3 py-2 text-left text-[11px] font-medium text-muted">時刻</th>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-muted">アクション</th>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-muted">予定</th>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-muted">結果</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border last:border-0 hover:bg-card-hover/50">
              <td className="px-3 py-2 text-[12px] text-muted tabular-nums whitespace-nowrap">
                {new Date(log.created_at).toLocaleString("ja-JP", {
                  month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="px-3 py-2 text-[12px]">
                {ACTION_LABELS[log.action] ?? log.action}
              </td>
              <td className="px-3 py-2">
                <p className="text-[12px] font-medium truncate max-w-[180px]">{log.event_title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(log.event_start).toLocaleString("ja-JP", {
                    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </td>
              <td className="px-3 py-2">
                {log.status === "success" ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-light text-success">
                    <span className="w-1 h-1 rounded-full bg-success" />
                    成功
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-error-light text-error">
                    <span className="w-1 h-1 rounded-full bg-error" />
                    エラー
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
