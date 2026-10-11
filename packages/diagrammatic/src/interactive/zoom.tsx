"use client";

import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { View } from "../react/svg";

/** Scale about the container's top-left corner, then translate, in pixels. */
export type Transform = { k: number; x: number; y: number };

export const IDENTITY: Transform = { k: 1, x: 0, y: 0 };

/**
 * The window `{k, x, y}` opens onto a figure `w` by `h` pixels, as fractions of
 * the box, clamped so a zoomed figure cannot be panned off its own frame.
 */
export function viewOf(transform: Transform, w: number, h: number): View {
  const span = 1 / Math.max(transform.k, 1e-6);
  const free = Math.max(0, 1 - span);
  const x = w > 0 ? -transform.x / (transform.k * w) : 0;
  const y = h > 0 ? -transform.y / (transform.k * h) : 0;
  return {
    x: clamp(x, 0, free),
    y: clamp(y, 0, free),
    w: span,
    h: span,
  };
}

export type ZoomProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "onChange" | "children"
> & {
  /**
   * A node is scaled as rendered, which is what arbitrary content needs. A
   * function receives the view window instead and hands it to a chart, which
   * redraws through it and keeps hairlines and type at their drawn size.
   */
  children: ReactNode | ((view: View) => ReactNode);
  transform?: Transform;
  defaultTransform?: Transform;
  onChange?: (transform: Transform) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

const clamp = (value: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, value));

/** Keeps the point under the pointer fixed while the scale changes. */
export function zoomAbout(
  transform: Transform,
  k: number,
  px: number,
  py: number,
): Transform {
  const ratio = k / transform.k;
  return {
    k,
    x: px - (px - transform.x) * ratio,
    y: py - (py - transform.y) * ratio,
  };
}

/**
 * Pan and zoom for a figure that holds more detail than its frame: the wheel
 * scales about the pointer, a drag pans, and double click or Escape resets.
 * The chart inside stays a server component and keeps drawing once, because
 * the transform lives on the wrapper rather than in the geometry.
 *
 * Nest it inside `Root` so mark delegation, tooltips, and highlighting keep
 * working through the transform.
 */
export const Zoom = forwardRef<HTMLDivElement, ZoomProps>(
  (
    {
      children,
      transform: controlled,
      defaultTransform = IDENTITY,
      onChange,
      min = 1,
      max = 12,
      disabled,
      style,
      onPointerDown,
      onDoubleClick,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const windowed = typeof children === "function";
    const [box, setBox] = useState({ w: 0, h: 0 });
    const [own, setOwn] = useState<Transform>(defaultTransform);
    const transform = controlled ?? own;
    const container = useRef<HTMLDivElement | null>(null);
    const drag = useRef<{ id: number; x: number; y: number } | null>(null);
    const latest = useRef(transform);
    latest.current = transform;

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        container.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const apply = useCallback(
      (next: Transform) => {
        const settled =
          next.k <= min + 1e-6
            ? { k: clamp(next.k, min, max), x: 0, y: 0 }
            : next;
        if (controlled === undefined) setOwn(settled);
        onChange?.(settled);
      },
      [controlled, max, min, onChange],
    );

    useEffect(() => {
      const node = container.current;
      if (!node || !windowed) return;
      const read = () => {
        const rect = node.getBoundingClientRect();
        setBox((current) =>
          current.w === rect.width && current.h === rect.height
            ? current
            : { w: rect.width, h: rect.height },
        );
      };
      read();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(read);
      observer.observe(node);
      return () => observer.disconnect();
    }, [windowed]);

    useEffect(() => {
      const node = container.current;
      if (!node || disabled) return;
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const rect = node.getBoundingClientRect();
        const current = latest.current;
        const k = clamp(current.k * Math.exp(-event.deltaY * 0.002), min, max);
        if (k === current.k) return;
        apply(
          zoomAbout(
            current,
            k,
            event.clientX - rect.left,
            event.clientY - rect.top,
          ),
        );
      };
      node.addEventListener("wheel", onWheel, { passive: false });
      return () => node.removeEventListener("wheel", onWheel);
    }, [apply, disabled, max, min]);

    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);
      if (disabled || event.defaultPrevented || event.button !== 0) return;
      if (latest.current.k <= min + 1e-6) return;
      drag.current = {
        id: event.pointerId,
        x: event.clientX - transform.x,
        y: event.clientY - transform.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const move = (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      apply({
        k: transform.k,
        x: event.clientX - state.x,
        y: event.clientY - state.y,
      });
    };

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (drag.current?.id !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    const keys = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (disabled || event.defaultPrevented) return;
      const node = container.current;
      const rect = node?.getBoundingClientRect();
      const cx = (rect?.width ?? 0) / 2;
      const cy = (rect?.height ?? 0) / 2;
      const step = 24;
      const scale = (factor: number) =>
        apply(
          zoomAbout(transform, clamp(transform.k * factor, min, max), cx, cy),
        );
      switch (event.key) {
        case "+":
        case "=":
          scale(1.3);
          break;
        case "-":
          scale(1 / 1.3);
          break;
        case "0":
        case "Escape":
          apply({ k: min, x: 0, y: 0 });
          break;
        case "ArrowLeft":
          apply({ ...transform, x: transform.x + step });
          break;
        case "ArrowRight":
          apply({ ...transform, x: transform.x - step });
          break;
        case "ArrowUp":
          apply({ ...transform, y: transform.y + step });
          break;
        case "ArrowDown":
          apply({ ...transform, y: transform.y - step });
          break;
        default:
          return;
      }
      event.preventDefault();
    };

    const zoomed = transform.k > min + 1e-6;

    return (
      <div
        ref={setRefs}
        data-dg-zoom=""
        data-zoomed={zoomed ? "" : undefined}
        tabIndex={disabled ? undefined : 0}
        onPointerDown={startDrag}
        onPointerMove={move}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(event) => {
          onDoubleClick?.(event);
          if (disabled || event.defaultPrevented) return;
          apply({ k: min, x: 0, y: 0 });
        }}
        onKeyDown={keys}
        style={{
          position: "relative",
          overflow: "hidden",
          touchAction: "none",
          cursor: disabled ? undefined : zoomed ? "grab" : undefined,
          ...style,
        }}
        {...props}
      >
        {windowed ? (
          (children as (view: View) => ReactNode)(
            viewOf(transform, box.w, box.h),
          )
        ) : (
          <div
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
              transformOrigin: "0 0",
            }}
          >
            {children as ReactNode}
          </div>
        )}
      </div>
    );
  },
);

Zoom.displayName = "Zoom";
