import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A print-register spec sheet: one hairline opens the list, one closes every
 * row, and a row pairs a mono term with quiet annotations above its details.
 */
export function DefinitionList({ className, ...props }: ComponentProps<"dl">) {
  return (
    <dl
      className={cn("border-foreground/10 w-full border-t", className)}
      {...props}
    />
  );
}

export function Definition({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("border-foreground/10 border-b py-3", className)}
      {...props}
    />
  );
}

export function DefinitionTerm({ className, ...props }: ComponentProps<"dt">) {
  return (
    <dt
      className={cn(
        "flex flex-wrap items-baseline gap-x-2.5 gap-y-1",
        className,
      )}
      {...props}
    />
  );
}

export function DefinitionName({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-foreground font-mono text-[13px] font-medium [font-variant-ligatures:none]",
        className,
      )}
      {...props}
    />
  );
}

export function DefinitionAnnotation({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground font-mono text-[11px] [font-variant-ligatures:none]",
        className,
      )}
      {...props}
    />
  );
}

export function DefinitionDetails({
  className,
  ...props
}: ComponentProps<"dd">) {
  return (
    <dd
      className={cn(
        "text-muted-foreground pt-1.5 text-sm leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
