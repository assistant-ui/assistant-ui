"use client";

import {
  type ComponentPropsWithoutRef,
  type PointerEvent,
  forwardRef,
  useMemo,
  useState,
} from "react";
import {
  type MarkDatum,
  type TooltipState,
  TooltipDispatchContext,
  TooltipStateContext,
} from "./context";

export type RootProps = ComponentPropsWithoutRef<"div">;

function datumOf(mark: Element): MarkDatum {
  const index = mark.getAttribute("data-i");
  return {
    index: index === null ? undefined : Number(index),
    series: mark.getAttribute("data-series") ?? undefined,
  };
}

/**
 * Wraps one or more charts and delegates pointer events to their
 * `data-part="mark"` elements. The charts themselves stay server components;
 * only this wrapper and the Tooltip are client code. The wrapper positions
 * relatively so the Tooltip can place itself in container coordinates.
 */
export const Root = forwardRef<HTMLDivElement, RootProps>(
  ({ children, style, onPointerMove, onPointerLeave, ...props }, ref) => {
    const [state, setState] = useState<TooltipState>({
      datum: null,
      x: 0,
      y: 0,
    });

    const dispatch = useMemo(
      () => ({
        onMarkMove: (datum: MarkDatum, x: number, y: number) => {
          setState({ datum, x, y });
        },
        onMarkLeave: () => {
          setState((prev) => (prev.datum ? { ...prev, datum: null } : prev));
        },
      }),
      [],
    );

    const handleMove = (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const mark = (event.target as Element).closest?.('[data-part="mark"]');
      if (mark) {
        const rect = event.currentTarget.getBoundingClientRect();
        dispatch.onMarkMove(
          datumOf(mark),
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
      } else {
        dispatch.onMarkLeave();
      }
    };

    const handleLeave = (event: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      dispatch.onMarkLeave();
    };

    return (
      <TooltipDispatchContext value={dispatch}>
        <TooltipStateContext value={state}>
          <div
            ref={ref}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            {...props}
            style={{ position: "relative", ...style }}
          >
            {children}
          </div>
        </TooltipStateContext>
      </TooltipDispatchContext>
    );
  },
);

Root.displayName = "Interactive.Root";
