"use client";

import { cn } from "@/lib/utils";
import { useChainOfThoughtStrings } from "./strings";

export function ChainOfThoughtPlaceholder({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const strings = useChainOfThoughtStrings();
  return (
    <div
      data-slot="chain-of-thought-placeholder"
      className={cn(
        "aui-chain-of-thought-placeholder",
        "py-2 pl-9 text-muted-foreground italic",
        className,
      )}
      {...props}
    >
      {children ?? strings.reasoningHidden}
    </div>
  );
}
