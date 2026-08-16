"use client";

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTooltipState } from "./context";
import type { MarkDatum } from "./datum";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export type TooltipProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: (props: { datum: MarkDatum }) => ReactNode;
  side?: TooltipSide;
  sideOffset?: number;
  collision?: boolean;
};

/**
 * Pure placement with collision handling: positions the tip box on the given
 * side of the anchor, flips top/bottom (or left/right) when the preferred
 * side would leave the container, then clamps the crossing axis. Returns
 * absolute left/top for a box of the measured size.
 */
export function resolvePlacement(
  side: TooltipSide,
  x: number,
  y: number,
  offset: number,
  tipW: number,
  tipH: number,
  containerW: number,
  containerH: number,
): { left: number; top: number } {
  let placed = side;
  if (side === "top" && y - offset - tipH < 0) placed = "bottom";
  else if (side === "bottom" && y + offset + tipH > containerH) placed = "top";
  else if (side === "left" && x - offset - tipW < 0) placed = "right";
  else if (side === "right" && x + offset + tipW > containerW) placed = "left";

  let left: number;
  let top: number;
  if (placed === "top" || placed === "bottom") {
    left = x - tipW / 2;
    top = placed === "top" ? y - offset - tipH : y + offset;
    left = Math.min(Math.max(left, 2), Math.max(2, containerW - tipW - 2));
  } else {
    top = y - tipH / 2;
    left = placed === "left" ? x - offset - tipW : x + offset;
    top = Math.min(Math.max(top, 2), Math.max(2, containerH - tipH - 2));
  }
  return { left, top };
}

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
  (
    {
      children,
      side = "top",
      sideOffset = 10,
      collision = true,
      style,
      ...props
    },
    ref,
  ) => {
    const state = useTooltipState();
    const inner = useRef<HTMLDivElement | null>(null);
    const [box, setBox] = useState<{ w: number; h: number } | null>(null);
    const datum = state?.datum ?? null;

    useLayoutEffect(() => {
      if (!collision || !datum) return;
      const el = inner.current;
      const parent = el?.offsetParent;
      if (!el || !(parent instanceof HTMLElement)) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setBox((prev) =>
        prev && prev.w === w && prev.h === h ? prev : { w, h },
      );
    }, [collision, datum]);

    if (!state?.datum) return null;

    const placement =
      collision && box
        ? resolvePlacement(
            side,
            state.x,
            state.y,
            sideOffset,
            box.w,
            box.h,
            (inner.current?.offsetParent as HTMLElement | null)?.offsetWidth ??
              Number.POSITIVE_INFINITY,
            (inner.current?.offsetParent as HTMLElement | null)?.offsetHeight ??
              Number.POSITIVE_INFINITY,
          )
        : PLACEMENT[side](state.x, state.y, sideOffset);

    return (
      <div
        ref={(node) => {
          inner.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role="tooltip"
        data-part="tooltip"
        {...props}
        style={{
          position: "absolute",
          pointerEvents: "none",
          ...placement,
          ...style,
        }}
      >
        {children({ datum: state.datum })}
      </div>
    );
  },
);

Tooltip.displayName = "Interactive.Tooltip";
