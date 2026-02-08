"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getSelectionMessageId } from "../../utils/getSelectionMessageId";

type SelectionInfo = {
  text: string;
  messageId: string;
  rect: DOMRect;
};

export const SelectionToolbarContext = createContext<SelectionInfo | null>(
  null,
);

export const useSelectionToolbarInfo = () =>
  useContext(SelectionToolbarContext);

export namespace SelectionToolbarPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * A floating toolbar that appears when text is selected within a message.
 *
 * Listens for mouse and keyboard selection events, validates that the
 * selection is within a single message, and renders a positioned portal
 * near the selection. Prevents mousedown from clearing the selection.
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
>(({ onMouseDown, style, ...props }, ref) => {
  const [info, setInfo] = useState<SelectionInfo | null>(null);

  useEffect(() => {
    const checkSelection = () => {
      requestAnimationFrame(() => {
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

        const messageId = getSelectionMessageId(sel);
        if (!messageId) {
          setInfo(null);
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setInfo({ text, messageId, rect });
      });
    };

    const handleSelectionCollapse = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setInfo(null);
      }
    };

    const handleScroll = () => {
      setInfo(null);
    };

    document.addEventListener("mouseup", checkSelection);
    document.addEventListener("keyup", checkSelection);
    document.addEventListener("selectionchange", handleSelectionCollapse);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mouseup", checkSelection);
      document.removeEventListener("keyup", checkSelection);
      document.removeEventListener("selectionchange", handleSelectionCollapse);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

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
        ref={ref}
        style={positionStyle}
        onMouseDown={(e) => {
          // Prevent mousedown from clearing the text selection
          e.preventDefault();
          onMouseDown?.(e);
        }}
      />
    </SelectionToolbarContext.Provider>,
    document.body,
  );
});

SelectionToolbarPrimitiveRoot.displayName = "SelectionToolbarPrimitive.Root";
