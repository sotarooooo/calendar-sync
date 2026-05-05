"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="relative z-10">{children}</div>;
  }

  return (
    <div className="flex min-h-screen relative z-10 w-full max-w-[1800px] mx-auto">
      <Sidebar />
      <main className="flex-1 ml-[280px] min-w-0 max-w-full relative">{children}</main>
    </div>
  );
}
