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
      <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-8 text-center">
        <p className="text-[13px] text-neutral-500">ログがありません</p>
        <p className="text-[11px] text-neutral-400 mt-1">同期を実行すると履歴が表示されます</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden text-[13px]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-3 py-2 text-left text-[11px] font-medium text-neutral-400">時刻</th>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-neutral-400">操作</th>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-neutral-400">予定名</th>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-neutral-400">結果</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-3 py-2 text-[12px] text-neutral-400 tabular-nums whitespace-nowrap">
                {new Date(log.created_at).toLocaleString("ja-JP", {
                  month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="px-3 py-2 text-[12px] text-neutral-600">
                {ACTION_LABELS[log.action] ?? log.action}
              </td>
              <td className="px-3 py-2">
                <p className="text-[12px] text-neutral-900 truncate max-w-[200px]">{log.event_title}</p>
              </td>
              <td className="px-3 py-2">
                {log.status === "success" ? (
                  <span className="text-[11px] text-green-600">成功</span>
                ) : (
                  <span className="text-[11px] text-red-600">エラー</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
