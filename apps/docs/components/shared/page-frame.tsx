import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const pads = {
  hero: "pt-20 pb-8 md:pt-28",
  sub: "pt-16 pb-32 md:pt-20",
} as const;

export function PageFrame({
  children,
  className,
  pad,
}: {
  children: ReactNode;
  className?: string;
  pad?: keyof typeof pads;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl px-4",
        pad && pads[pad],
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageCopy({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl text-[15px] leading-relaxed", className)}>
      {children}
    </div>
  );
}
