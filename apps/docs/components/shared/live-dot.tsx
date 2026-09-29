import { cn } from "@/lib/utils";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none",
        className,
      )}
    />
  );
}
