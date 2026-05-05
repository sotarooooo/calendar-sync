import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthLayout } from "@/components/AuthLayout";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Calendar Sync",
  description: "Sync calendar events between TimeTree and Google Calendar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={outfit.className}>
      <body className="min-h-screen antialiased bg-slate-50 relative selection:bg-blue-500/30 font-sans">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[140px]" />
          <div className="absolute top-[30%] -right-[5%] w-[45%] h-[45%] rounded-full bg-indigo-500/10 blur-[140px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
        </div>

        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
