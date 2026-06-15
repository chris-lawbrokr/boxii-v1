import { requireUser } from "@/app/lib/dal";

export default async function SettingsPage() {
  const user = await requireUser("/login");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
      <p className="mt-1 text-sm text-gray-500">Your Boxii account details.</p>

      <div className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200/80">
        <Row label="Name" value={user.name} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role} capitalize />
      </div>

      <p className="mt-4 text-sm text-gray-400">Editing account details is coming soon.</p>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}
