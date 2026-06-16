import type { ReactNode } from "react";
import Image from "next/image";

/** Auth card sized like the Boxii designs: a 9:16 portrait card on small
 *  screens that becomes a 16:9 (1920×1080) landscape card at ≥1080px. Capped to
 *  a max width so it stays a balanced, floating card (with margin around it)
 *  rather than filling the whole screen; the height-derived cap keeps it fitting
 *  on short viewports. */
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
    <main className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-6">
      <div className="relative mx-auto flex aspect-[1080/1920] w-full max-w-[min(100%,26rem,calc((100dvh_-_3rem)*9/16))] items-center justify-center overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-white shadow-float min-[1080px]:aspect-[1920/1080] min-[1080px]:max-w-[min(100%,64rem,calc((100dvh_-_3rem)*16/9))]">
        <div className="max-h-full w-full max-w-md overflow-y-auto px-10 py-10">
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
      </div>
    </main>
  );
}
