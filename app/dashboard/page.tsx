import { requireUser } from "@/app/lib/dal";
import { LogoutButton } from "@/app/ui/logout-button";

export default async function DashboardPage() {
  // Secure check at the data boundary (not in a layout).
  const user = await requireUser("/login");

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Customer dashboard
          </p>
          <h1 className="text-lg font-semibold">Boxii</h1>
        </div>
        <LogoutButton />
      </header>

      <section className="px-6 py-10">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h2>
        <p className="mt-2 text-gray-600">
          Signed in as <span className="font-medium">{user.email}</span> ·{" "}
          <span className="rounded bg-blue-100 px-2 py-0.5 text-sm font-medium text-blue-700">
            {user.role}
          </span>
        </p>
        <p className="mt-6 max-w-prose text-gray-500">
          This is a placeholder customer dashboard. Popover design tools land in a later phase —
          for now it just proves the auth flow end to end.
        </p>
      </section>
    </main>
  );
}
