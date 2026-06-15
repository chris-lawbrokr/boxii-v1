"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { UserMenu } from "./user-menu";
import { Breadcrumb } from "./breadcrumb";

/** App shell — floating header (hamburger + breadcrumb + account menu) and a
 *  collapsible left slide-out (pushes content) over a content box. No footer.
 *  Sidebar CONTENT is injected via the @sidebar slot so it varies by route. */
export function DashboardShell({
  user,
  projects,
  sidebar,
  children,
}: {
  user: { name: string; email: string } | null;
  projects: { id: string; name: string }[];
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  const box = "rounded-2xl border border-gray-200/80 bg-white shadow-float";

  return (
    <div className="flex h-[100dvh] flex-col gap-3 bg-gray-50 p-3 sm:gap-4 sm:p-4">
      <header className={`flex h-14 shrink-0 items-center gap-3 px-4 ${box}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse menu" : "Expand menu"}
          aria-expanded={open}
          aria-controls="dashboard-sidebar"
          className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Breadcrumb projects={projects} />

        <div className="ml-auto pl-3">
          <UserMenu user={user} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          id="dashboard-sidebar"
          className={`shrink-0 overflow-hidden transition-[width,margin] duration-200 ease-in-out ${
            open ? "w-72 mr-3 sm:mr-4" : "w-0"
          }`}
        >
          <div className={`flex h-full w-72 flex-col overflow-y-auto p-3 ${box}`}>{sidebar}</div>
        </aside>

        <main className={`min-w-0 flex-1 overflow-y-auto p-6 ${box}`}>{children}</main>
      </div>
    </div>
  );
}
