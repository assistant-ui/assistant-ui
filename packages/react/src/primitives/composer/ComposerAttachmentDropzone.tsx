"use client";

import {
  forwardRef,
  useCallback,
  useState,
  type ReactElement,
  cloneElement,
  isValidElement,
} from "react";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Slot } from "radix-ui";
import type React from "react";
import { useAui } from "@assistant-ui/store";

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

  const handleDragEnterCapture = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragOverCapture = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      if (!isDragging) setIsDragging(true);
    },
    [disabled, isDragging],
  );

  const handleDragLeaveCapture = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) {
        return;
      }
      setIsDragging(false);
    },
    [disabled],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      await Promise.all(
        files.map(async (file) => {
          try {
            await aui.composer().addAttachment(file);
          } catch (error) {
            console.error("Failed to add attachment:", error);
          }
        }),
      );
    },
    [disabled, aui],
  );

  const mergedProps = {
    ...(isDragging ? { "data-dragging": "true" } : null),
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
    const renderChildren =
      children !== undefined
        ? children
        : (render.props as Record<string, unknown>).children;
    return (
      <Slot.Root {...mergedProps}>
        {cloneElement(render, undefined, renderChildren as React.ReactNode)}
      </Slot.Root>
    );
  }

  const Comp = asChild ? Slot.Root : "div";
  return <Comp {...mergedProps}>{children}</Comp>;
});

ComposerPrimitiveAttachmentDropzone.displayName =
  "ComposerPrimitive.AttachmentDropzone";
