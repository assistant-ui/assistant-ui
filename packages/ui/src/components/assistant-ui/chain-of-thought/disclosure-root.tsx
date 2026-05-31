"use client";

import type { VariantProps } from "class-variance-authority";
import { DisclosureRoot, type DisclosureRootProps } from "./disclosure-base";
import { cn } from "@/lib/utils";
import {
  ANIMATION_DURATION,
  EASE_OUT_EXPO,
  SPRING_EASING,
  STEP_STAGGER_DELAY,
  chainOfThoughtVariants,
} from "./styles";

/** Props for the ChainOfThought collapsible root primitive. */
export type ChainOfThoughtRootProps = DisclosureRootProps &
  VariantProps<typeof chainOfThoughtVariants>;

/** Collapsible container that applies ChainOfThought variants and motion tokens. */
export function ChainOfThoughtRoot({
  className,
  variant,
  children,
  style,
  ...props
}: ChainOfThoughtRootProps) {
  return (
    <DisclosureRoot
      data-slot="chain-of-thought-root"
      data-variant={variant}
      animationDuration={ANIMATION_DURATION}
      lockOnProgrammaticClose
      className={cn(
        "group/chain-of-thought-root",
        chainOfThoughtVariants({ variant, className }),
      )}
      style={
        {
          "--spring-easing": SPRING_EASING,
          "--ease-out-expo": EASE_OUT_EXPO,
          "--step-stagger-delay": `${STEP_STAGGER_DELAY}ms`,
          ...(style ?? {}),
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </DisclosureRoot>
  );
}
