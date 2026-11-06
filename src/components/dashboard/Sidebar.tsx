"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

export type SidebarMode = "auto" | "open" | "closed";

export type DashboardView =
  | "dashboard"
  | "applications"
  | "interviews"
  | "cover-letters"
  | "polls"
  | "documents"
  | "expenses"
  | "settings";

interface SidebarProps {
  userEmail: string | null;
  active?: DashboardView;
  mode: SidebarMode;
  onClose: () => void;
  onNavigate: (view: DashboardView) => void;
  onLogout: () => void;
}

const NAV_ITEMS: { label: string; key: DashboardView; icon: LucideIcon }[] = [
  { label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
  { label: "Applications", key: "applications", icon: Briefcase },
  { label: "Interviews", key: "interviews", icon: CalendarDays },
  { label: "Cover letters", key: "cover-letters", icon: FileText },
  { label: "Polls", key: "polls", icon: BarChart3 },
  { label: "Documents", key: "documents", icon: FolderOpen },
  { label: "Expenses", key: "expenses", icon: Receipt },
  { label: "Settings", key: "settings", icon: Settings },
];

export function Sidebar({ userEmail, active = "dashboard", mode, onClose, onNavigate, onLogout }: SidebarProps) {
  // Always rendered so open/close slides instead of snapping.
  // The aside is fixed; on desktop the content makes room via lg:ml-60.
  const visibility =
    mode === "closed"
      ? "-translate-x-full"
      : mode === "open"
        ? "translate-x-0"
        : "-translate-x-full lg:translate-x-0";
  return (
    <aside
      className={`flex ${visibility} fixed inset-y-0 left-0 z-40 h-screen w-60 shrink-0 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out motion-reduce:transition-none`}
    >
      <div className="px-4 py-5 border-b border-slate-100 flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-bold tracking-tight text-slate-900 leading-none">
            Huntern
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Intern Hunter OS
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide sidebar"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={`group flex w-full items-center gap-3 text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 ease-in-out ${
                isActive
                  ? "bg-indigo-50 font-semibold text-indigo-700 shadow-sm"
                  : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm"
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-400 group-hover:text-indigo-600"
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
          >
            {(userEmail ?? "?").charAt(0).toUpperCase()}
          </span>
          <p className="text-xs text-slate-600 truncate" title={userEmail ?? ""}>
            {userEmail ?? "Guest"}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 bg-slate-900 text-white text-sm font-semibold rounded-lg py-2 px-4 hover:bg-slate-800 active:scale-[0.98] transition"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>
  );
}
