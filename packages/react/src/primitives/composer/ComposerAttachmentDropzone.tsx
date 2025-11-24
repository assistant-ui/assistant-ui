"use client";

import { forwardRef, useCallback, useState } from "react";

import { Slot } from "@radix-ui/react-slot";
import React from "react";
import { useAssistantApi } from "../../context";

export namespace ComposerPrimitiveAttachmentDropzone {
  export type Element = HTMLDivElement;
  export type Props = React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean | undefined;
    disabled?: boolean | undefined;
  };
}

export const ComposerPrimitiveAttachmentDropzone = forwardRef<
  HTMLDivElement,
  ComposerPrimitiveAttachmentDropzone.Props
>(({ disabled, asChild = false, children, ...rest }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const api = useAssistantApi();

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
    onDragEnterCapture: handleDragEnterCapture,
    onDragOverCapture: handleDragOverCapture,
    onDragLeaveCapture: handleDragLeaveCapture,
    onDropCapture: handleDrop,
  };

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
