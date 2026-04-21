"use client";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar-bg border-r border-border flex flex-col">
      <div className="px-5 h-14 flex items-center border-b border-border">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="font-semibold text-sm">Calendar Sync</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <a href="#" className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-md bg-accent/8 text-accent font-medium">
          <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          概要
        </a>
        <a href="#rules" className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-md text-muted hover:text-foreground hover:bg-card-hover transition-colors">
          <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          ルール
        </a>
        <a href="#logs" className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-md text-muted hover:text-foreground hover:bg-card-hover transition-colors">
          <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          ログ
        </a>
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-semibold">S</div>
          <span className="text-[13px] text-muted">Sotaro</span>
        </div>
      </div>
    </aside>
  );
}
