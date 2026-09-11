import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A print-register data table: an opening hairline, a hairline under every
 * row, and no vertical rules or fills. The wrapper scrolls horizontally so
 * wide tables never scroll the page.
 */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="not-prose relative w-full overflow-x-auto">
      <table
        className={cn(
          "border-foreground/10 w-full caption-bottom border-t text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn(className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn(className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn("text-foreground font-medium", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr className={cn("border-foreground/10 border-b", className)} {...props} />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "text-muted-foreground h-9 px-3 text-start align-middle font-mono text-[11px] font-medium tracking-wide whitespace-nowrap first:ps-0 last:pe-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-top leading-relaxed first:ps-0 last:pe-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: ComponentProps<"caption">) {
  return (
    <caption
      className={cn(
        "text-muted-foreground mt-3 text-start font-mono text-[11px] tracking-wide",
        className,
      )}
      {...props}
    />
  );
}
