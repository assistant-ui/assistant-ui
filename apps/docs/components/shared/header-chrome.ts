import { cn } from "@/lib/utils";

export function headerBarClassName(scrolled: boolean, className?: string) {
  return cn(
    "relative z-10 transition-colors duration-200",
    scrolled ? "bg-background/80 backdrop-blur-md" : "bg-transparent",
    "group-data-[menu-open=true]:bg-background",
    className,
  );
}
