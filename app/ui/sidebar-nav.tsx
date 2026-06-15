import Link from "next/link";
import { FolderKanban } from "lucide-react";

/** Global nav shown in the sidebar on the projects list and other top-level
 *  routes. */
export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-1">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900"
      >
        <FolderKanban className="h-4 w-4" />
        Projects
      </Link>
    </nav>
  );
}
