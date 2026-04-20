import React from "react";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: number | string;
  accent?: boolean;
  error?: boolean;
  icon: LucideIcon;
  color: "blue" | "emerald" | "slate" | "rose";
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  accent,
  error,
  icon: Icon,
  color,
}) => {
  let valueColor = "text-slate-800";
  let iconBg = "bg-slate-100 text-slate-500 border-slate-200";
  let cardBorder = "border-slate-200/60";
  
  if (accent || color === "emerald") {
    valueColor = "text-emerald-500";
    iconBg = "bg-emerald-50 text-emerald-500 border-emerald-100";
    cardBorder = "border-emerald-200/50 hover:border-emerald-400/50";
  }
  if (error || color === "rose") {
    valueColor = "text-rose-500";
    iconBg = "bg-rose-50 text-rose-500 border-rose-100";
    cardBorder = "border-rose-200/50 hover:border-rose-400/50";
  }
  if (color === "blue" && !accent && !error) {
    valueColor = "text-blue-600";
    iconBg = "bg-blue-50 text-blue-600 border-blue-100";
    cardBorder = "border-blue-200/50 hover:border-blue-400/50";
  }
  if (color === "slate" && !accent && !error) {
    valueColor = "text-slate-700";
    iconBg = "bg-slate-100 text-slate-600 border-slate-200";
    cardBorder = "border-slate-200/60 hover:border-slate-400/50";
  }

  return (
    <div className={`glass-panel rounded-3xl p-6 flex flex-col relative overflow-hidden group border-2 ${cardBorder} transition-colors bg-white/60 backdrop-blur-xl shadow-lg shadow-slate-200/20`}>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-transform group-hover:scale-110 shadow-sm ${iconBg}`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-end">
          <div className="w-2 h-2 rounded-full bg-current opacity-20 mb-1" />
          <div className="w-1 h-1 rounded-full bg-current opacity-20" />
        </div>
      </div>
      <div className="relative z-10">
        <p className={`text-6xl font-black tabular-nums tracking-tighter ${valueColor} group-hover:scale-105 origin-bottom-left transition-transform duration-500 ease-out leading-none mb-3 drop-shadow-sm`}>{value}</p>
        <p className="text-[14px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
      
      {/* Super huge decorative background flair */}
      <div className={`absolute -bottom-8 -right-8 w-48 h-48 rounded-full opacity-10 blur-3xl ${valueColor.replace('text-', 'bg-')}`} />
      <Icon size={140} strokeWidth={1} className={`absolute -bottom-8 -right-8 opacity-[0.03] text-slate-900 transform rotate-12 group-hover:-rotate-12 group-hover:scale-110 transition-all duration-700 ease-out`} />
    </div>
  );
};
