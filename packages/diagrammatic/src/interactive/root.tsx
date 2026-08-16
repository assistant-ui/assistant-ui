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

export type RootProps = ComponentPropsWithoutRef<"div"> & {
  onMarkClick?: (datum: MarkDatum, event: MouseEvent<HTMLDivElement>) => void;
  onMarkHover?: (datum: MarkDatum | null) => void;
  highlight?: MarkQuery | readonly MarkQuery[] | null;
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
 * marks getting a pointer cursor while it is provided. The wrapper positions
 * relatively so the Tooltip can place itself in container coordinates.
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
    const highlightKey = JSON.stringify(highlight ?? null);
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
        onMarkLeave: () => {
          setState((prev) => (prev.datum ? { ...prev, datum: null } : prev));
        },
      }),
      [],
    );

    const handleMove = (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const datum = getMarkDatum(event.target);
      if (datum) {
        const rect = event.currentTarget.getBoundingClientRect();
        dispatch.onMarkMove(
          datum,
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
      } else {
        dispatch.onMarkLeave();
      }
      const mark = datum?.element ?? null;
      if (mark !== lastMark.current) {
        lastMark.current = mark;
        onMarkHover?.(datum);
      }
    };

    const handleLeave = (event: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      dispatch.onMarkLeave();
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
