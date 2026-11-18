"use client";

import { useEffect, useState, type ComponentType } from "react";

// The ⌘K dialog pulls in cmdk, the search index loader and zod (via the
// suggestion hook). None of it is needed for first paint, so the dialog loads
// on idle, on hover or focus of a search button, or on the first open,
// whichever comes first. An open requested before the chunk arrives is kept
// and the dialog appears as soon as it loads.

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchDialogComponent = ComponentType<SearchDialogProps>;

let loaded: SearchDialogComponent | null = null;
let pending: Promise<SearchDialogComponent> | null = null;

function loadSearchDialog(): Promise<SearchDialogComponent> {
  pending ??= import("./search-dialog").then(
    (mod) => {
      loaded = mod.SearchDialog;
      return loaded;
    },
    (error: unknown) => {
      // A failed chunk load is retried on the next hover, focus or open.
      pending = null;
      throw error;
    },
  );
  return pending;
}

/** Starts loading the dialog; safe to call on every hover or focus. */
export function preloadSearchDialog(): void {
  loadSearchDialog().catch(() => {});
}

const onIdle = (run: () => void) => {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 1500);
  return () => window.clearTimeout(id);
};

export function SearchDialog(props: SearchDialogProps) {
  const [Dialog, setDialog] = useState<SearchDialogComponent | null>(
    () => loaded,
  );

  useEffect(() => {
    if (Dialog) return;
    let live = true;
    const load = () => {
      loadSearchDialog().then(
        (component) => {
          if (live) setDialog(() => component);
        },
        () => {},
      );
    };
    if (props.open) {
      load();
      return () => {
        live = false;
      };
    }
    const cancel = onIdle(load);
    return () => {
      live = false;
      cancel();
    };
  }, [Dialog, props.open]);

  return Dialog ? <Dialog {...props} /> : null;
}
