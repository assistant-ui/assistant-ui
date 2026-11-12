import type { ReactNode } from "react";

export function AskAiWindowFrame({
  children,
  open,
}: {
  children: ReactNode;
  open: boolean;
}) {
  return (
    <div
      hidden={!open}
      style={open ? undefined : { display: "none" }}
      className="animate-in fade-in-0 slide-in-from-bottom-3 bg-popover md:ring-foreground/10 fixed inset-0 z-50 flex flex-col overflow-hidden duration-300 ease-out motion-reduce:animate-none md:inset-auto md:right-5 md:bottom-5 md:h-[min(42rem,calc(100vh-6rem))] md:w-[min(30rem,calc(100vw-2.5rem))] md:rounded-xl md:shadow-[0_16px_48px_-24px_rgb(0_0_0/0.25)] md:ring-1 dark:md:shadow-[0_16px_48px_-24px_rgb(0_0_0/0.6)]"
    >
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
