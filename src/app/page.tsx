import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar Sync</h1>
          <p className="text-sm text-muted">カレンダー間の予定を自動同期</p>
        </div>
      </div>
      <Dashboard />
    </main>
  );
}
