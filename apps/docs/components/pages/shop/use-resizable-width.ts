import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export const DEFAULT_WIDTH = 384;
export const MIN_WIDTH = 320;
const MARGIN = 64;
const STEP = 24;

export const maxWidth = () => window.innerWidth - MARGIN;

const clamp = (value: number) =>
  Math.min(Math.max(value, MIN_WIDTH), maxWidth());

const KEY_WIDTH: Record<string, (current: number) => number> = {
  ArrowLeft: (current) => current + STEP,
  ArrowRight: (current) => current - STEP,
  Home: () => MIN_WIDTH,
  End: () => Infinity,
};

export function useResizableWidth() {
  const [width, setWidth] = useState<number>();
  const dragging = useRef(false);
  return {
    width,
    handle: {
      "aria-valuenow": width ?? DEFAULT_WIDTH,
      "aria-valuemin": MIN_WIDTH,
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        event.preventDefault();
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (!dragging.current) return;
        setWidth(clamp(window.innerWidth - event.clientX));
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        dragging.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        const next = KEY_WIDTH[event.key];
        if (next === undefined) return;
        event.preventDefault();
        setWidth(clamp(next(width ?? DEFAULT_WIDTH)));
      },
    },
  };
}
