"use client";

import {
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type PointerEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type TooltipState,
  TooltipDispatchContext,
  TooltipStateContext,
} from "./context";
import { type MarkDatum, getMarkDatum } from "./datum";
import { type MarkQuery, applyHighlight } from "./highlight";

/**
 * Pointer flicker guard: leaving a mark keeps the tooltip alive for this many
 * milliseconds, so sweeping across the gaps between dense marks reads as one
 * continuous hover. Re-entering any mark cancels the pending clear; leaving
 * the container clears immediately.
 */
const GRACE_MS = 120;

export type RootProps = ComponentPropsWithoutRef<"div"> & {
  onMarkClick?: (datum: MarkDatum, event: MouseEvent<HTMLDivElement>) => void;
  onMarkHover?: (datum: MarkDatum | null) => void;
  highlight?: MarkQuery | readonly MarkQuery[] | null;
  highlightOnHover?: boolean;
};

/**
 * Wraps one or more charts and delegates pointer events to their
 * `data-part="mark"` elements. The charts themselves stay server components;
 * only this wrapper and the Tooltip are client code.
 *
 * Actions layer on the same delegation: hover feeding the Tooltip is the
 * built-in default, `onMarkHover` fires once per mark entered or left (null
 * on leave) for stateful effects like cross-highlighting, and `onMarkClick`
 * fires when a mark is clicked — navigation, drill-down, selection — with
 * marks getting a pointer cursor while it is provided. `highlightOnHover`
 * spotlights the hovered mark's index (or series) through the same stamps as
 * the controlled `highlight` prop, which takes precedence when provided. The
 * wrapper positions relatively so the Tooltip can place itself in container
 * coordinates.
 */
export const Root = forwardRef<HTMLDivElement, RootProps>(
  (
    {
      children,
      style,
      onPointerMove,
      onPointerLeave,
      onClick,
      onMarkClick,
      onMarkHover,
      highlight,
      highlightOnHover,
      ...props
    },
    ref,
  ) => {
    const [state, setState] = useState<TooltipState>({
      datum: null,
      x: 0,
      y: 0,
    });
    const lastMark = useRef<Element | null>(null);
    const container = useRef<HTMLDivElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        container.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    const [hoverHighlight, setHoverHighlight] = useState<MarkQuery | null>(
      null,
    );
    const effectiveHighlight =
      highlight !== undefined
        ? highlight
        : highlightOnHover
          ? hoverHighlight
          : null;
    const highlightKey = JSON.stringify(effectiveHighlight ?? null);
    useEffect(() => {
      if (!container.current) return;
      applyHighlight(
        container.current,
        JSON.parse(highlightKey) as MarkQuery | MarkQuery[] | null,
      );
    }, [highlightKey]);

    const dispatch = useMemo(
      () => ({
        onMarkMove: (datum: MarkDatum, x: number, y: number) => {
          setState({ datum, x, y });
        },
        onPointerDrift: (x: number, y: number) => {
          setState((prev) => (prev.datum ? { ...prev, x, y } : prev));
        },
        onMarkLeave: () => {
          setState((prev) => (prev.datum ? { ...prev, datum: null } : prev));
        },
      }),
      [],
    );

    const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelGrace = useCallback(() => {
      if (graceTimer.current !== null) {
        clearTimeout(graceTimer.current);
        graceTimer.current = null;
      }
    }, []);
    useEffect(() => cancelGrace, [cancelGrace]);

    const handleMove = (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const datum = getMarkDatum(event.target);
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (datum) {
        cancelGrace();
        dispatch.onMarkMove(datum, x, y);
        if (datum.element !== lastMark.current) {
          lastMark.current = datum.element;
          onMarkHover?.(datum);
          setHoverHighlight(
            datum.index !== undefined
              ? { index: datum.index }
              : datum.series
                ? { series: datum.series }
                : null,
          );
        }
      } else {
        dispatch.onPointerDrift(x, y);
        if (lastMark.current && graceTimer.current === null) {
          graceTimer.current = setTimeout(() => {
            graceTimer.current = null;
            lastMark.current = null;
            onMarkHover?.(null);
            setHoverHighlight(null);
            dispatch.onMarkLeave();
          }, GRACE_MS);
        }
      }
    };

    const handleLeave = (event: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      cancelGrace();
      dispatch.onMarkLeave();
      setHoverHighlight(null);
      if (lastMark.current) {
        lastMark.current = null;
        onMarkHover?.(null);
      }
    };

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
      if (!onMarkClick) return;
      const datum = getMarkDatum(event.target);
      if (datum) onMarkClick(datum, event);
    };

    return (
      <TooltipDispatchContext value={dispatch}>
        <TooltipStateContext value={state}>
          <div
            ref={setRefs}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            onClick={handleClick}
            {...props}
            style={{
              position: "relative",
              ...(onMarkClick && state.datum ? { cursor: "pointer" } : {}),
              ...style,
            }}
          >
            {children}
          </div>
        </TooltipStateContext>
      </TooltipDispatchContext>
    );
  },
);

Root.displayName = "Interactive.Root";
