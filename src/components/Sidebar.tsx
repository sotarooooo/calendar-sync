"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GitMerge, ListFilter, Activity, ChevronsUpDown, CalendarSync, Sparkles, CalendarDays, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/rules", label: "ルール設定", icon: GitMerge },
  { href: "/logs", label: "アクセスログ", icon: ListFilter },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl text-slate-300">
      {/* Workspace Switcher */}
      <div className="p-4">
        <button className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/50 group-hover:scale-105 transition-transform">
              <CalendarSync size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-black text-white leading-none tracking-tight mb-1">My Workspace</p>
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Sparkles size={10} className="text-amber-400" />
                Pro Plan
              </div>
            </div>
          </div>
          <ChevronsUpDown size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pt-4 space-y-10">
        <div>
          <p className="px-3 mb-4 text-[11px] font-bold text-slate-500/80 uppercase tracking-widest">メニュー</p>
          <div className="space-y-1.5">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] transition-all duration-300 ${
                    active
                      ? "bg-blue-600/10 text-white font-bold"
                      : "text-slate-400 font-medium hover:text-white hover:bg-white/5"
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-500 rounded-r-md shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                  )}
                  <Icon
                    size={20}
                    className={`transition-all duration-300 ${
                      active ? "text-blue-500 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Status & Logout */}
      <div className="p-6 mt-auto space-y-3">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/50">
              <Activity size={18} className="text-emerald-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-200">System Normal</p>
              <p className="text-[11px] font-medium text-slate-500">自動同期: 稼働中</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <LogOut size={16} />
          ログアウト
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
