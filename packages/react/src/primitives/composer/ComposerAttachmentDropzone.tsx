"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  isValidElement,
} from "react";

import { composeEventHandlers } from "radix-ui/internal";
import { Slot } from "radix-ui";
import type React from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { renderSlot } from "../../utils/Primitive";

export namespace ComposerPrimitiveAttachmentDropzone {
  export type Element = HTMLDivElement;
  export type Props = React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean | undefined;
    render?: ReactElement | undefined;
    disabled?: boolean | undefined;
  };
}

export const ComposerPrimitiveAttachmentDropzone = forwardRef<
  HTMLDivElement,
  ComposerPrimitiveAttachmentDropzone.Props
>(({ disabled, asChild = false, render, children, ...rest }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const aui = useAui();
  const disabledByThread = useAuiState((s) => s.thread.isDisabled);
  const isDisabled = disabled || disabledByThread;

  useEffect(() => {
    if (!isDisabled) return;
    // Disabled handlers cannot clear the latch, so reset it when the enabled period ends.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDragging(false);
  }, [isDisabled]);

  // An unprevented file drop navigates the tab to the file, so file drags are
  // claimed via preventDefault even when the runtime does not support attachments.
  const handleDragEnterCapture = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      if (isDisabled || !aui.thread.getState().capabilities.attachments) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
      setIsDragging(true);
    },
    [isDisabled, aui],
  );

  const handleDragOverCapture = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      if (isDisabled || !aui.thread.getState().capabilities.attachments) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
      if (!isDragging) setIsDragging(true);
    },
    [isDisabled, isDragging, aui],
  );

  const handleDragLeaveCapture = useCallback(
    (e: React.DragEvent) => {
      if (isDisabled) return;
      e.preventDefault();
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) {
        return;
      }
      setIsDragging(false);
    },
    [isDisabled],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      setIsDragging(false);
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      if (isDisabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (!aui.thread.getState().capabilities.attachments || files.length === 0)
        return;
      await Promise.all(
        files.map(async (file) => {
          try {
            await aui.composer.addAttachment(file);
          } catch {
            // The composer runtime emits composer.attachmentAddError before rejecting;
            // the readonly and empty-thread stubs only throw.
          }
        }),
      );
    },
    [isDisabled, aui],
  );

  const mergedProps = {
    ...(isDragging && !isDisabled ? { "data-dragging": "true" } : null),
    ...rest,
    onDragEnterCapture: composeEventHandlers(
      rest.onDragEnterCapture,
      handleDragEnterCapture,
    ),
    onDragOverCapture: composeEventHandlers(
      rest.onDragOverCapture,
      handleDragOverCapture,
    ),
    onDragLeaveCapture: composeEventHandlers(
      rest.onDragLeaveCapture,
      handleDragLeaveCapture,
    ),
    onDropCapture: composeEventHandlers(rest.onDropCapture, handleDrop),
    ref,
  };

  if (render && isValidElement(render)) {
    return renderSlot(render, children, mergedProps);
  }

  const Comp = asChild ? Slot.Root : "div";
  return <Comp {...mergedProps}>{children}</Comp>;
});

ComposerPrimitiveAttachmentDropzone.displayName =
  "ComposerPrimitive.AttachmentDropzone";
