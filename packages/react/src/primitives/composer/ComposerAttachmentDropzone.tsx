"use client";

import { forwardRef, useCallback, useEffect, useState } from "react";

import { Slot } from "@radix-ui/react-slot";
import React from "react";
import { useAssistantApi } from "../../context";

export namespace ComposerPrimitiveAttachmentDropzone {
  export type Element = HTMLDivElement;
  export type Props = React.HTMLAttributes<HTMLDivElement> & {
    /**
     * Whether to render as a child component using Slot.
     * When true, the component will merge its props with its child.
     */
    asChild?: boolean | undefined;
    /**
     * Whether the dropzone is disabled.
     */
    disabled?: boolean | undefined;
  };
}

/**
 * A drag-and-drop zone for adding file attachments to the composer.
 *
 * This component wraps content and enables drag-and-drop functionality for adding
 * file attachments. Files dropped on this component are automatically added to
 * the composer's attachment list. The component provides visual feedback during
 * drag operations through the `data-dragging` attribute.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.AttachmentDropzone>
 *   <ComposerPrimitive.Input />
 *   <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
 * </ComposerPrimitive.AttachmentDropzone>
 * ```
 */
export const ComposerPrimitiveAttachmentDropzone = forwardRef<
  HTMLDivElement,
  ComposerPrimitiveAttachmentDropzone.Props
>(({ disabled, asChild = false, children, ...rest }, ref) => {
  const [dragDepth, setDragDepth] = useState(0);
  const api = useAssistantApi();

  // Reset drag state when user releases mouse outside the browser window
  useEffect(() => {
    const handleWindowDragEnd = () => {
      setDragDepth(0);
    };

    window.addEventListener("dragend", handleWindowDragEnd);
    window.addEventListener("drop", handleWindowDragEnd);

    return () => {
      window.removeEventListener("dragend", handleWindowDragEnd);
      window.removeEventListener("drop", handleWindowDragEnd);
    };
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragDepth((prev) => prev + 1);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragDepth((prev) => Math.max(0, prev - 1));
    },
    [disabled],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragDepth(0);
      for (const file of e.dataTransfer.files) {
        try {
          await api.composer().addAttachment(file);
        } catch (error) {
          console.error("Failed to add attachment:", error);
        }
      }
    },
    [disabled, api],
  );

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const isDragging = dragDepth > 0;

  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      {...(isDragging ? { "data-dragging": "true" } : null)}
      ref={ref}
      {...dragProps}
      {...rest}
    >
      {children}
    </Comp>
  );
});

ComposerPrimitiveAttachmentDropzone.displayName =
  "ComposerPrimitive.AttachmentDropzone";
