import { cn } from "./_adapter";

export function CodeBlockProgress({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 motion-safe:animate-pulse",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-6 w-6 rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-1.5 px-4 py-3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
      </div>
    </div>
  );
}
