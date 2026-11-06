"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export interface HeaderNotification {
  id: string;
  title: string;
  subtitle: string;
}

interface HeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  userEmail: string | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onAddJob: () => void;
  notifications?: HeaderNotification[];
  onOpenInterviews?: () => void;
}

export function Header({
  query,
  onQueryChange,
  userEmail,
  sidebarOpen,
  onToggleSidebar,
  onAddJob,
  notifications = [],
  onOpenInterviews,
}: HeaderProps) {
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    if (!bellOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bellOpen]);

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200/90">
      <div className="flex items-center gap-3 p-4">
        {/* Left: toggle + brand + search */}
         <button
           type="button"
           onClick={onToggleSidebar}
           aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
           aria-expanded={sidebarOpen}
           className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 ease-in-out"
         >
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-current rounded-full" />
            <span className="block h-0.5 w-5 bg-current rounded-full" />
            <span className="block h-0.5 w-5 bg-current rounded-full" />
          </span>
        </button>

        <p className="lg:hidden text-lg font-bold tracking-tight text-slate-900">
          Huntern
        </p>

        <div className="flex-1 max-w-xl">
          <label htmlFor="dashboard-search" className="sr-only">
            Search applications
          </label>
          <input
            id="dashboard-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search company or role..."
            className="w-full rounded-lg bg-slate-100 border border-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Right cluster: actions + utilities + profile */}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-4">
           <button
             type="button"
             onClick={onAddJob}
             className="hidden sm:block bg-indigo-600 text-white text-sm font-semibold rounded-lg py-2 px-4 shadow-sm hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-in-out"
           >
            + Add job
          </button>

          <div className="relative">
             <button
               type="button"
               onClick={() => setBellOpen((v) => !v)}
               aria-label={`Notifications${notifications.length > 0 ? `, ${notifications.length} unread` : ""}`}
               aria-expanded={bellOpen}
               className="relative shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 ease-in-out"
             >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {notifications.length > 0 && (
                <span className="tnum absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {bellOpen && (
              <>
                <div
                  aria-hidden="true"
                  onClick={() => setBellOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                >
                  <p className="px-4 py-2.5 border-b border-slate-100 text-sm font-semibold text-slate-900">
                    Upcoming interviews
                  </p>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-slate-500">
                      Nothing scheduled — move a card to Interview.
                    </p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {notifications.map((n) => (
                        <li key={n.id} className="px-4 py-2.5 hover:bg-slate-50">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {n.title}
                          </p>
                          <p className="tnum text-xs text-slate-500 truncate">{n.subtitle}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {onOpenInterviews && notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setBellOpen(false);
                        onOpenInterviews();
                      }}
                      className="w-full px-4 py-2.5 border-t border-slate-100 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors text-left"
                    >
                      View all interviews →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
            >
              {(userEmail ?? "?").charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-medium text-slate-700 max-w-32 truncate">
              {userEmail ?? "Guest"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
