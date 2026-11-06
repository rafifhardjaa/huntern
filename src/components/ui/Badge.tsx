import type { HTMLAttributes } from "react";

type StatusTone =
  | "wishlist"
  | "applied"
  | "interview"
  | "offered"
  | "rejected"
  | "neutral"
  | "danger"
  | "warning";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

const toneStyles: Record<StatusTone, string> = {
  wishlist: "bg-slate-100 text-slate-600",
  applied: "bg-indigo-50 text-indigo-700",
  interview: "bg-amber-50 text-amber-700",
  offered: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
  danger: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-700",
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${toneStyles[tone]} ${className}`}
      {...props}
    />
  );
}
