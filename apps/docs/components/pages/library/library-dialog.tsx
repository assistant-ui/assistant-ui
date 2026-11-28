"use client";

import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

// A centered dialog on Base UI's Dialog, for a library item that reads better
// as a document than as a side panel.

export const LibraryDialog = DialogPrimitive.Root;
export const LibraryDialogTitle = DialogPrimitive.Title;
export const LibraryDialogDescription = DialogPrimitive.Description;
export const LibraryDialogClose = DialogPrimitive.Close;

export function LibraryDialogContent({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
      <DialogPrimitive.Popup
        className={cn(
          "bg-background ring-foreground/10 fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-(--library-floating) shadow-xl ring-1 outline-none",
          "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-none",
          className,
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}
