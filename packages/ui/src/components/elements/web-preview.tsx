"use client";

import type { ComponentProps } from "react";
import { ExternalLinkIcon, RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, ghostButton, mono, paper } from "./surfaces";

/**
 * Chrome around a preview: a URL bar, reload, and open-in-new. It renders
 * `children` as given and enforces no isolation of its own, so the caller is
 * responsible for passing an already-sandboxed frame.
 */
export function WebPreview({
  origin,
  loading,
  children,
  onReload,
  onOpenExternal,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "origin" | "loading" | "children" | "onReload" | "onOpenExternal"
> & {
  origin: string;
  loading: boolean;
  children: React.ReactNode;
  onReload?: () => void;
  onOpenExternal?: () => void;
}) {
  return (
    <div
      data-slot="web-preview"
      className={cn(
        paper,
        "flex w-full max-w-md flex-col overflow-hidden rounded-2xl",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <button
          type="button"
          aria-label="Reload the preview"
          onClick={onReload}
          className={cn(ghostButton, "size-7 shrink-0")}
        >
          <RotateCwIcon
            className={cn(
              "size-3.5",
              loading && "animate-spin motion-reduce:animate-none",
            )}
          />
        </button>

        <span
          className={cn(
            field,
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 py-1",
          )}
        >
          <span className={cn(mono, "text-foreground/45 min-w-0 truncate")}>
            {origin}
          </span>
        </span>

        <button
          type="button"
          aria-label="Open the preview in a new tab"
          onClick={onOpenExternal}
          className={cn(ghostButton, "size-7 shrink-0")}
        >
          <ExternalLinkIcon className="size-3.5" />
        </button>
      </div>

      <div className="border-foreground/[0.07] relative min-h-[9rem] border-t">
        <div
          aria-hidden={loading}
          className={cn(
            "transition-opacity duration-300 motion-reduce:transition-none",
            loading && "invisible opacity-0",
          )}
        >
          {children}
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-foreground/40 relative inline-block text-xs leading-none">
              <span>Loading preview</span>
              <span
                aria-hidden
                className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
              >
                Loading preview
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
