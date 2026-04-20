import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "glassPadded";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "glass",
  className = "",
  ...props
}) => {
  const variants = {
    default: "bg-white border text-slate-800",
    glass: "glass-card text-slate-800",
    glassPadded: "glass-panel p-6 bg-white/40 text-slate-800",
  };

  return (
    <div
      className={`rounded-3xl border border-slate-200/50 shadow-sm ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
