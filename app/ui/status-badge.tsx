const STYLES: Record<string, string> = {
  gathering: "bg-amber-100 text-amber-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
