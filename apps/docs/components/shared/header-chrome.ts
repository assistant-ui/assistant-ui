import { cn } from "@/lib/utils";

export const headerSlashClassName = "text-muted-foreground/40 mx-2 sm:mx-3";

export const headerSwitcherClassName =
  "text-foreground hover:bg-foreground/5 data-[popup-open]:bg-foreground/5 focus-visible:ring-foreground/20 -mx-1.5 flex h-7 min-w-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-sm transition-colors outline-none focus-visible:ring-1";

export function headerBarClassName(scrolled: boolean, className?: string) {
  return cn(
    "relative z-10 transition-colors duration-200",
    scrolled ? "bg-background/80 backdrop-blur-md" : "bg-transparent",
    "group-data-[menu-open=true]:bg-background",
    className,
  );
}
