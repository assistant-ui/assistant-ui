import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Steps({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 flex-col [counter-reset:step]", className)}
      {...props}
    />
  );
}

export function Step({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group relative flex gap-4 [counter-increment:step]",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center">
        <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium after:content-[counter(step)]" />
        <div className="bg-border w-px flex-1 group-last:hidden" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5 pb-6 group-last:pb-0 [&>h3]:mt-0! [&>h3]:mb-3! [&>h3]:text-base! [&>h3]:font-medium!">
        {children}
      </div>
    </div>
  );
}
