"use client";

import { CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ChainOfThoughtFade({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-fade"
      className={cn(
        "aui-chain-of-thought-fade",
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8",
        "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
        "group-data-[variant=muted]/chain-of-thought-root:bg-[linear-gradient(to_top,var(--color-muted),transparent)]",
        "dark:group-data-[variant=muted]/chain-of-thought-root:bg-[linear-gradient(to_top,var(--color-card),transparent)]",
        "fade-in-0 animate-in duration-(--animation-duration)",
        "group-data-[state=open]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]",
        "group-data-[state=open]/collapsible-content:fill-mode-forwards",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        "motion-reduce:animate-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export function ChainOfThoughtContent({
  className,
  children,
  style,
  showFade = true,
  ...props
}: React.ComponentProps<typeof CollapsibleContent> & {
  showFade?: boolean | undefined;
}) {
  return (
    <CollapsibleContent
      data-slot="chain-of-thought-content"
      className={cn(
        "aui-chain-of-thought-content",
        "relative overflow-hidden text-muted-foreground text-sm outline-none",
        "group/collapsible-content",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=open]:fill-mode-backwards",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=open]:ease-(--spring-easing)",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=closed]:delay-[calc(var(--animation-duration)*0.35)]",
        "data-[state=closed]:duration-[calc(var(--animation-duration)*0.6)]",
        "data-[state=closed]:ease-(--ease-out-expo)",
        "data-[state=closed]:fill-mode-both",
        "data-[state=closed]:pointer-events-none",
        "motion-reduce:animate-none motion-reduce:transition-none",
        className,
      )}
      {...props}
      style={style}
    >
      {children}
      {showFade ? <ChainOfThoughtFade /> : null}
    </CollapsibleContent>
  );
}
