import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const ANIMATION_DURATION = 200;
export const SPRING_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";
export const EASE_OUT_EXPO = "cubic-bezier(0.4, 0, 0.2, 1)";
export const STEP_STAGGER_DELAY = 25;

/** Shared className for step icons — hoisted to avoid re-creating the string on every render. */
export const STEP_ICON_CLASS =
  "aui-chain-of-thought-step-icon relative z-10 size-4 transition-[color,transform] duration-200 ease-(--spring-easing)";

/** Shared entrance animation for containers (Timeline, Text) inside CollapsibleContent. */
export const CONTAINER_ENTER_ANIM = [
  "group-data-[state=open]/collapsible-content:animate-in",
  "group-data-[state=open]/collapsible-content:fade-in-0",
  "group-data-[state=open]/collapsible-content:slide-in-from-top-3",
  "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
  "group-data-[state=open]/collapsible-content:ease-(--spring-easing)",
].join(" ");

/** Shared exit animation for containers (Timeline, Text) inside CollapsibleContent. */
export const CONTAINER_EXIT_ANIM = [
  "group-data-[state=closed]/collapsible-content:animate-out",
  "group-data-[state=closed]/collapsible-content:fade-out-0",
  "group-data-[state=closed]/collapsible-content:slide-out-to-top-2",
  "group-data-[state=closed]/collapsible-content:duration-[calc(var(--animation-duration)*0.6)]",
  "group-data-[state=closed]/collapsible-content:ease-(--ease-out-expo)",
].join(" ");

/** Shared entrance animation for step connectors (staggered fade-in). */
export const CONNECTOR_ENTER_ANIM =
  "fade-in-0 animate-in fill-mode-both delay-[var(--step-delay)] duration-(--animation-duration) ease-(--spring-easing) motion-reduce:animate-none";

/** Shared exit animation for step connectors (fade only, no slide). */
export const CONNECTOR_EXIT_ANIM = [
  "group-data-[state=closed]/collapsible-content:fade-out-0",
  "group-data-[state=closed]/collapsible-content:animate-out",
  "group-data-[state=closed]/collapsible-content:fill-mode-both",
  "group-data-[state=closed]/collapsible-content:delay-0",
  "group-data-[state=closed]/collapsible-content:duration-[calc(var(--animation-duration)*0.4)]",
  "group-data-[state=closed]/collapsible-content:ease-(--ease-out-expo)",
].join(" ");

/** Shared exit animation for step elements (fade + slide, simultaneous). */
export const STEP_EXIT_ANIM = [
  "group-data-[state=closed]/collapsible-content:animate-out",
  "group-data-[state=closed]/collapsible-content:fade-out-0",
  "group-data-[state=closed]/collapsible-content:slide-out-to-top-2",
  "group-data-[state=closed]/collapsible-content:fill-mode-both",
  "group-data-[state=closed]/collapsible-content:delay-0",
  "group-data-[state=closed]/collapsible-content:duration-[calc(var(--animation-duration)*0.4)]",
  "group-data-[state=closed]/collapsible-content:ease-(--ease-out-expo)",
].join(" ");

export const chainOfThoughtVariants = cva(
  "aui-chain-of-thought-root mb-4 w-full",
  {
    variants: {
      variant: {
        outline: "rounded-lg border bg-background px-3 py-2",
        ghost: "bg-transparent",
        muted: "rounded-lg bg-muted px-3 py-2 dark:bg-card",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

export const STEP_BASE_CLASS = cn(
  "aui-chain-of-thought-step relative flex items-start gap-3 py-1.5",
  "overflow-visible",
  "[--step-delay:calc(var(--step-index,0)*var(--step-stagger-delay,25ms))]",
);
