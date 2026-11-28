"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CircleAlertIcon, CircleCheckIcon, XIcon } from "lucide-react";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { cn } from "@/lib/utils";

type ToastAction = { label: string; onClick: () => void };

type Toast = {
  id: number;
  message: string;
  tone: "success" | "error";
  action?: ToastAction;
  group?: string;
};

const DURATION = 4000;
const EMPTY: readonly Toast[] = [];

let toasts: readonly Toast[] = EMPTY;
let nextId = 0;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const dismiss = (id: number) => {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
};

/** Shows a message; a newer toast with the same `group` replaces the older one. */
const show = (
  tone: Toast["tone"],
  message: string,
  options: { action?: ToastAction; group?: string } = {},
) => {
  const id = nextId++;
  const toast: Toast = {
    id,
    message,
    tone,
    ...(options.action && { action: options.action }),
    ...(options.group && { group: options.group }),
  };
  const kept = options.group
    ? toasts.filter((entry) => entry.group !== options.group)
    : toasts;
  toasts = [...kept, toast].slice(-3);
  emit();
};

export const libraryToast = {
  success: (message: string, options?: Parameters<typeof show>[2]) =>
    show("success", message, options),
  error: (message: string, options?: Parameters<typeof show>[2]) =>
    show("error", message, options),
};

export const copyWithLibraryToast = async (text: string, copied: string) => {
  if (await copyTextToClipboard(text)) libraryToast.success(copied);
  else libraryToast.error("The clipboard is not available.");
};

function ToastItem({ toast }: { toast: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), DURATION);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const Icon = toast.tone === "success" ? CircleCheckIcon : CircleAlertIcon;

  return (
    <li
      className={cn(
        "bg-popover text-popover-foreground ring-foreground/10 pointer-events-auto flex w-full items-center gap-2.5 rounded-(--library-floating) py-2 ps-3 pe-2 text-sm shadow-lg ring-1",
        "animate-in fade-in-0 slide-in-from-top-2 duration-150 motion-reduce:animate-none",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          toast.tone === "error" ? "text-destructive" : "text-muted-foreground",
        )}
      />
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
          className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring h-7 shrink-0 cursor-pointer rounded-(--library-control) px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring grid size-7 shrink-0 cursor-pointer place-items-center rounded-(--library-icon) transition-colors outline-none focus-visible:ring-2"
      >
        <XIcon aria-hidden className="size-3.5" />
      </button>
    </li>
  );
}

/** Renders the library's toasts; mount it once on a page that shows them. */
export function LibraryToaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );

  return (
    <section
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4"
    >
      <ol className="flex w-full max-w-sm flex-col gap-2">
        {items.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ol>
    </section>
  );
}
