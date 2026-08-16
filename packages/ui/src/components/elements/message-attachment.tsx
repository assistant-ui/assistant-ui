"use client";

import type { ComponentProps } from "react";
import { FileTextIcon, ImageIcon, PaperclipIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface MessageAttachmentItem {
  id: string;
  name: string;
  size: string;
  kind: "image" | "document" | "file";
  pages?: number;
  swatch?: string;
}

export function MessageAttachments({
  attachments,
  onOpen,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "attachments" | "onOpen"> & {
  attachments: readonly MessageAttachmentItem[];
  onOpen?: (id: string) => void;
}) {
  return (
    <div
      data-slot="message-attachments"
      className={cn("flex w-full max-w-sm flex-col gap-1.5", className)}

      {...props}
    >
      {attachments.map((item) =>
        item.kind === "image" ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen?.(item.id)}
            className={cn(
              paper,
              "fade-in animate-in fill-mode-both group flex w-full items-center gap-3 overflow-hidden rounded-2xl p-2 text-start duration-300",
            )}
          >
            <span
              aria-hidden
              className="size-12 shrink-0 rounded-xl bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none"
              style={{
                backgroundImage: item.swatch,
                backgroundColor: "var(--color-foreground)",
              }}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 pe-2">
              <span className="text-foreground/90 truncate text-[13.5px]">
                {item.name}
              </span>
              <span className={cn(mono, "text-foreground/35")}>
                {item.size}
              </span>
            </span>
            <ImageIcon className="text-foreground/25 me-2 size-3.5 shrink-0" />
          </button>
        ) : (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen?.(item.id)}
            className={cn(
              field,
              "fade-in animate-in fill-mode-both hover:bg-foreground/[0.07] flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-start transition-colors duration-300",
            )}
          >
            <span className="bg-background/70 text-foreground/45 flex size-8 shrink-0 items-center justify-center rounded-lg">
              {item.kind === "document" ? (
                <FileTextIcon className="size-3.5" />
              ) : (
                <PaperclipIcon className="size-3.5" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-foreground/90 truncate text-[13.5px]">
                {item.name}
              </span>
              <span className={cn(mono, "text-foreground/35")}>
                {item.size}
                {item.pages !== undefined && ` · ${item.pages} pages`}
              </span>
            </span>
          </button>
        ),
      )}
    </div>
  );
}
