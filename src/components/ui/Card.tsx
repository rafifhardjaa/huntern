import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm ${
        hoverable ? "hover:shadow-md hover:border-slate-300 transition-all duration-200 ease-in-out" : ""
      } ${className}`}
      {...props}
    />
  );
}
