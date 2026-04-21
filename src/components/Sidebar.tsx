"use client";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-48 bg-white border-r border-neutral-200 flex flex-col text-[13px]">
      <div className="px-4 h-12 flex items-center border-b border-neutral-200">
        <span className="font-semibold text-neutral-900">CalSync</span>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        <a href="#" className="block px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium">
          概要
        </a>
        <a href="#rules" className="block px-3 py-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100">
          ルール
        </a>
        <a href="#logs" className="block px-3 py-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100">
          ログ
        </a>
      </nav>

      <div className="p-2 border-t border-neutral-200">
        <div className="px-3 py-1.5 text-neutral-400 text-[11px]">
          Sotaro
        </div>
      </div>
    </aside>
  );
}
