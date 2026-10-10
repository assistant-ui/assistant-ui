"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DEFAULT_WIDTH } from "../react/svg";

export type FitSize = { width: number };

export type FitProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: (size: FitSize) => ReactNode;
  /** The width used for the server render and the first client render, before the box has been measured. */
  initial?: number;
  /** Width is reported in steps of this many pixels, so a drag redraws the figure a few times rather than once a pixel. Rounded down, so the figure never outgrows its host. */
  step?: number;
};

/**
 * Measures its own width and hands it to the figure, so a chart in a fluid
 * layout fills its host and keeps its type, margins and marks at their pixel
 * sizes. Charts rendered inside the callback are client components; a figure
 * whose width is known from the layout should be given that `width` directly
 * and stay on the server.
 */
export const Fit = forwardRef<HTMLDivElement, FitProps>(
  ({ children, initial = DEFAULT_WIDTH, step = 8, style, ...props }, ref) => {
    const [width, setWidth] = useState(initial);
    const container = useRef<HTMLDivElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        container.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    useEffect(() => {
      const node = container.current;
      if (!node) return;
      const read = () => {
        const measured = node.getBoundingClientRect().width;
        if (!(measured > 0)) return;
        const next =
          step > 1
            ? Math.max(step, Math.floor(measured / step) * step)
            : measured;
        setWidth((current) => (current === next ? current : next));
      };
      read();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(read);
      observer.observe(node);
      return () => observer.disconnect();
    }, [step]);

    return (
      <div ref={setRefs} style={{ width: "100%", ...style }} {...props}>
        {children({ width })}
      </div>
    );
  },
);

Fit.displayName = "Fit";
