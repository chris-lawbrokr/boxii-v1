import type { ReactNode } from "react";

/** Standard auth card: bold left-aligned title, form, and footer — all inside
 *  one bordered card, centered on the page. */
export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>

        <div className="mt-6">{children}</div>

        {footer && <p className="mt-6 text-center text-sm text-gray-600">{footer}</p>}
      </div>
    </main>
  );
}
