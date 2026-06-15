import type { ReactNode } from "react";
import Image from "next/image";

/** Standard auth card: brand logo, bold left-aligned title, form, and footer —
 *  all inside one bordered card, centered on the page. */
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
        <Image
          src="/images/logo.svg"
          alt="Boxii"
          width={97}
          height={34}
          priority
          unoptimized
          className="mx-auto mb-6 block"
        />

        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>

        <div className="mt-6">{children}</div>

        {footer && <p className="mt-6 text-center text-sm text-gray-600">{footer}</p>}
      </div>
    </main>
  );
}
