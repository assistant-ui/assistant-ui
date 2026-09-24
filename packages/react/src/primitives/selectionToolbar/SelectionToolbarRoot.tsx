"use client";

import { Primitive } from "../../utils/Primitive";
import { composeEventHandlers } from "radix-ui/internal";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getSelectionMessageId } from "../../utils/getSelectionMessageId";
import { useThreadRootElementRef } from "../thread/ThreadRootElementContext";

type SelectionInfo = {
  text: string;
  messageId: string;
  rect: DOMRect;
};

const SelectionToolbarContext = createContext<SelectionInfo | null>(null);

export const useSelectionToolbarInfo = () =>
  useContext(SelectionToolbarContext);

export namespace SelectionToolbarPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * A floating toolbar that appears when text is selected within a message.
 *
 * Listens for browser selection changes, validates that the selection is
 * within a single message, and renders a positioned portal near the
 * selection. Prevents mousedown from clearing the selection.
 *
 * @example
 * ```tsx
 * <SelectionToolbarPrimitive.Root>
 *   <SelectionToolbarPrimitive.Quote>Quote</SelectionToolbarPrimitive.Quote>
 * </SelectionToolbarPrimitive.Root>
 * ```
 */
export const SelectionToolbarPrimitiveRoot = forwardRef<
  SelectionToolbarPrimitiveRoot.Element,
  SelectionToolbarPrimitiveRoot.Props
>(({ onMouseDown, style, ...props }, forwardedRef) => {
  const [info, setInfo] = useState<SelectionInfo | null>(null);
  const threadRootRef = useThreadRootElementRef();
  const warnedAboutMissingThreadRootRef = useRef(false);

  useEffect(() => {
    // Read the selection on the next frame so the browser has settled it.
    let pendingFrame: number | null = null;
    let isMouseDragging = false;

    const checkSelection = () => {
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          setInfo(null);
          return;
        }

        const text = sel.toString().trim();
        if (!text) {
          setInfo(null);
          return;
        }

        if (threadRootRef && !threadRootRef.current) {
          if (
            process.env.NODE_ENV !== "production" &&
            !warnedAboutMissingThreadRootRef.current
          ) {
            warnedAboutMissingThreadRootRef.current = true;
            console.warn(
              "[SelectionToolbarPrimitive.Root] ThreadPrimitive.Root did not provide a DOM element, so the selection cannot be scoped to its thread. Ensure a custom root child forwards its ref.",
            );
          }
        }

        const messageId = getSelectionMessageId(sel, threadRootRef?.current);
        if (!messageId) {
          setInfo(null);
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setInfo({ text, messageId, rect });
      });
    };

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        if (pendingFrame !== null) {
          cancelAnimationFrame(pendingFrame);
          pendingFrame = null;
        }
        setInfo(null);
        return;
      }

      if (!isMouseDragging) checkSelection();
    };

    const handleScroll = () => {
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }
      setInfo(null);
    };

    const handleMouseDown = () => {
      isMouseDragging = true;
    };

    const handleMouseUp = () => {
      isMouseDragging = false;
      checkSelection();
    };

    const handleMouseCancel = () => {
      isMouseDragging = false;
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("dragend", handleMouseUp, true);
    // A context menu can consume the mouseup of the press that opened it.
    document.addEventListener("contextmenu", handleMouseCancel, true);
    window.addEventListener("blur", handleMouseCancel);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("dragend", handleMouseUp, true);
      document.removeEventListener("contextmenu", handleMouseCancel, true);
      window.removeEventListener("blur", handleMouseCancel);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [threadRootRef]);

  if (!info) return null;

  const positionStyle: React.CSSProperties = {
    position: "fixed",
    top: `${info.rect.top - 8}px`,
    left: `${info.rect.left + info.rect.width / 2}px`,
    transform: "translate(-50%, -100%)",
    zIndex: 50,
    ...style,
  };

  return createPortal(
    <SelectionToolbarContext.Provider value={info}>
      <Primitive.div
        {...props}
        ref={forwardedRef}
        style={positionStyle}
        onMouseDown={composeEventHandlers(onMouseDown, (e) => {
          // Prevent mousedown from clearing the text selection
          e.preventDefault();
        })}
      />
    </SelectionToolbarContext.Provider>,
    document.body,
  );
});

SelectionToolbarPrimitiveRoot.displayName = "SelectionToolbarPrimitive.Root";
