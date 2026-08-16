"use client";

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  forwardRef,
} from "react";
import { useTooltipState } from "./context";
import type { MarkDatum } from "./datum";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export type TooltipProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: (props: { datum: MarkDatum }) => ReactNode;
  side?: TooltipSide;
  sideOffset?: number;
};

const PLACEMENT: Record<
  TooltipSide,
  (x: number, y: number, offset: number) => CSSProperties
> = {
  top: (x, y, offset) => ({
    left: x,
    top: y - offset,
    transform: "translate(-50%, -100%)",
  }),
  bottom: (x, y, offset) => ({
    left: x,
    top: y + offset,
    transform: "translate(-50%, 0)",
  }),
  left: (x, y, offset) => ({
    left: x - offset,
    top: y,
    transform: "translate(-100%, -50%)",
  }),
  right: (x, y, offset) => ({
    left: x + offset,
    top: y,
    transform: "translate(0, -50%)",
  }),
};

/**
 * Follows the pointer across hovered marks. Bring your own surface: this
 * renders positioning only, never a background or border, and never intercepts
 * the pointer.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ children, side = "top", sideOffset = 10, style, ...props }, ref) => {
    const state = useTooltipState();
    if (!state?.datum) return null;

    return (
      <div
        ref={ref}
        role="tooltip"
        data-part="tooltip"
        {...props}
        style={{
          position: "absolute",
          pointerEvents: "none",
          ...PLACEMENT[side](state.x, state.y, sideOffset),
          ...style,
        }}
      >
        {children({ datum: state.datum })}
      </div>
    );
  },
);

Tooltip.displayName = "Interactive.Tooltip";
