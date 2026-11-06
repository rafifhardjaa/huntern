import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "dark" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
  dark: "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md",
  danger: "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`text-sm font-semibold rounded-lg px-4 py-2 shadow-sm transition-all duration-200 ease-in-out disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}
