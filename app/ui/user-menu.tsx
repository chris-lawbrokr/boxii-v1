"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { logout } from "@/app/lib/actions";

/** Circular user avatar in the header that opens a dropdown with account
 *  settings and sign out. */
export function UserMenu({
  user,
  placement = "bottom-right",
}: {
  user: { name: string; email: string } | null;
  /** Where the dropdown opens relative to the avatar. */
  placement?: "bottom-right" | "top-left";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuPosition =
    placement === "top-left" ? "bottom-full left-0 mb-2" : "right-0 mt-2";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = getInitials(user?.name || user?.email || "?");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-float ${menuPosition}`}
        >
          {user && (
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          )}

          <Link
            href="/dashboard/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 text-gray-400" />
            Account settings
          </Link>

          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return value.slice(0, 2).toUpperCase();
}
