"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useRef,
  useState,
} from "react";

export type ModalView = "thread" | "list";

type ModalSize = { readonly width: number; readonly height: number };

type ResizeDrag = {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly direction: 1 | -1;
  last: ModalSize | null;
};

const SIZE_STORAGE_KEY = "aui-modal-size";
const MIN_SIZE: ModalSize = { width: 320, height: 400 };
// The trigger and its offsets sit below the modal, so the height leaves room for them.
const VIEWPORT_INSET: ModalSize = { width: 32, height: 96 };
const RESIZE_STEP = 16;

const clampSize = ({ width, height }: ModalSize): ModalSize => ({
  width: Math.round(
    Math.max(
      MIN_SIZE.width,
      Math.min(width, window.innerWidth - VIEWPORT_INSET.width),
    ),
  ),
  height: Math.round(
    Math.max(
      MIN_SIZE.height,
      Math.min(height, window.innerHeight - VIEWPORT_INSET.height),
    ),
  ),
});

const readStoredSize = (): ModalSize | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(SIZE_STORAGE_KEY) ?? "null",
    );
    if (typeof stored !== "object" || stored === null) return null;
    const { width, height } = stored as Record<string, unknown>;
    if (typeof width !== "number" || typeof height !== "number") return null;
    return clampSize({ width, height });
  } catch {
    return null;
  }
};

const storeSize = (size: ModalSize | null) => {
  try {
    if (size) {
      window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
    } else {
      window.localStorage.removeItem(SIZE_STORAGE_KEY);
    }
  } catch {
    // Without storage the size lasts until the page reloads.
  }
};

const isRtl = (element: Element) =>
  getComputedStyle(element).direction === "rtl";

export const useModalSize = (contentRef: RefObject<HTMLDivElement | null>) => {
  const [size, setSize] = useState(readStoredSize);
  const dragRef = useRef<ResizeDrag | null>(null);

  const commitSize = (next: ModalSize | null) => {
    setSize(next);
    storeSize(next);
  };

  const sizeFromPointer = (
    drag: ResizeDrag,
    event: PointerEvent<HTMLElement>,
  ) =>
    clampSize({
      width: drag.width - (event.clientX - drag.x) * drag.direction,
      height: drag.height - (event.clientY - drag.y),
    });

  const takeDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return null;
    dragRef.current = null;
    return drag;
  };

  const reset = () => {
    dragRef.current = null;
    commitSize(null);
  };

  return {
    size,
    reset,
    handleProps: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        const content = contentRef.current;
        if (event.button !== 0 || !content) return;
        const rect = content.getBoundingClientRect();
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          width: rect.width,
          height: rect.height,
          direction: isRtl(content) ? -1 : 1,
          last: null,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (!drag.last && event.clientX === drag.x && event.clientY === drag.y)
          return;
        drag.last = sizeFromPointer(drag, event);
        setSize(drag.last);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const drag = takeDrag(event);
        if (!drag) return;
        if (drag.last || event.clientX !== drag.x || event.clientY !== drag.y) {
          commitSize(sizeFromPointer(drag, event));
        }
      },
      onPointerCancel: (event: PointerEvent<HTMLElement>) => {
        const drag = takeDrag(event);
        if (drag?.last) commitSize(drag.last);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        const content = contentRef.current;
        if (!content) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          reset();
          return;
        }
        const step = event.shiftKey ? RESIZE_STEP * 4 : RESIZE_STEP;
        const rtl = isRtl(content);
        const changes: Record<string, readonly [number, number]> = {
          ArrowUp: [0, step],
          ArrowDown: [0, -step],
          [rtl ? "ArrowRight" : "ArrowLeft"]: [step, 0],
          [rtl ? "ArrowLeft" : "ArrowRight"]: [-step, 0],
        };
        const change = changes[event.key];
        if (!change) return;
        event.preventDefault();
        const rect = content.getBoundingClientRect();
        commitSize(
          clampSize({
            width: rect.width + change[0],
            height: rect.height + change[1],
          }),
        );
      },
    },
  };
};
