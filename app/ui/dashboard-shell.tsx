"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/lib/actions";

/** App shell for the dashboard: always-visible header + footer, and a left
 *  sidebar that pushes the content to the right when opened (collapses to
 *  zero width when closed). Toggled by the menu button in the header. */
export function DashboardShell({
  user,
  children,
}: {
  user: { name: string; email: string } | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      {/* Header — always visible */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse menu" : "Expand menu"}
          aria-expanded={open}
          aria-controls="dashboard-sidebar"
          className="-ml-1 rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <MenuIcon open={open} />
        </button>

        <Image src="/images/logo.svg" alt="Boxii" width={74} height={26} priority unoptimized />

        <div className="ml-auto flex items-center gap-3">
          {user?.email && (
            <span className="hidden text-sm text-gray-600 sm:inline">{user.email}</span>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Body row: sidebar (pushes) + main content */}
      <div className="flex flex-1">
        <aside
          id="dashboard-sidebar"
          className={`shrink-0 overflow-hidden border-gray-200 bg-white transition-[width] duration-200 ease-in-out ${
            open ? "w-64 border-r" : "w-0"
          }`}
        >
          {/* Fixed inner width so content is clipped (not reflowed) while animating */}
          <nav className="flex w-64 flex-col gap-1 p-3">
            <Link
              href="/dashboard"
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900"
            >
              Projects
            </Link>
            <NavPlaceholder label="Analytics" />
            <NavPlaceholder label="Settings" />
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>

      {/* Footer — always visible */}
      <footer className="sticky bottom-0 z-40 flex h-12 items-center justify-center border-t border-gray-200 bg-white px-4 text-xs text-gray-500">
        © {new Date().getFullYear()} Boxii
      </footer>
    </div>
  );
}

function NavPlaceholder({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-400">
      {label}
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
        Soon
      </span>
    </span>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}
