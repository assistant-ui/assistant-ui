"use client";

import { create } from "zustand";
import type { Unsubscribe } from "@assistant-ui/core";

export type SizeHandle = {
  /** Update the height */
  setHeight: (height: number) => void;
  /** Unregister this handle */
  unregister: Unsubscribe;
};

type SizeRegistry = {
  register: () => SizeHandle;
};

const createSizeRegistry = (
  onChange: (total: number) => void,
): SizeRegistry => {
  const entries = new Map<symbol, number>();

  const recalculate = () => {
    let total = 0;
    for (const height of entries.values()) {
      total += height;
    }
    onChange(total);
  };

  return {
    register: () => {
      const id = Symbol();
      entries.set(id, 0);

      return {
        setHeight: (height: number) => {
          if (entries.get(id) !== height) {
            entries.set(id, height);
            recalculate();
          }
        },
        unregister: () => {
          entries.delete(id);
          recalculate();
        },
      };
    },
  };
};

export type ThreadViewportState = {
  readonly isAtBottom: boolean;
  readonly scrollToBottom: (config?: {
    behavior?: ScrollBehavior | undefined;
  }) => void;
  readonly onScrollToBottom: (
    callback: ({ behavior }: { behavior: ScrollBehavior }) => void,
  ) => Unsubscribe;

  /** Controls scroll anchoring: "top" anchors user messages at top, "bottom" is classic behavior */
  readonly turnAnchor: "top" | "bottom";

  /** Clamps tall user messages so the assistant response stays in view. */
  readonly topAnchorMessageClamp: {
    readonly tallerThan: string;
    readonly visibleHeight: string;
  };

  /** Raw height values from registered elements */
  readonly height: {
    /** Total viewport height */
    readonly viewport: number;
    /** Total content inset height (footer, anchor message, etc.) */
    readonly inset: number;
  };

  /** Current DOM elements used for geometry-based top anchoring */
  readonly element: {
    readonly viewport: HTMLElement | null;
    readonly anchor: HTMLElement | null;
    readonly target: HTMLElement | null;
  };

  /** Numeric clamp configuration for the active top-anchor target message */
  readonly targetConfig: {
    readonly tallerThan: number;
    readonly visibleHeight: number;
  } | null;

  /** Register a viewport and get a handle to update its height */
  readonly registerViewport: () => SizeHandle;

  /** Register a content inset (footer, anchor message, etc.) and get a handle to update its height */
  readonly registerContentInset: () => SizeHandle;

  /** Register the scroll viewport element */
  readonly registerViewportElement: (
    element: HTMLElement | null,
  ) => Unsubscribe;

  /** Register the current anchor user message element */
  readonly registerAnchorElement: (element: HTMLElement | null) => Unsubscribe;

  /**
   * Register the current top-anchor target (last assistant response) element
   * along with its numeric clamp configuration. When unregistered, both
   * `element.target` and `targetConfig` clear together.
   */
  readonly registerAnchorTargetElement: (
    element: HTMLElement | null,
    config?: { readonly tallerThan: number; readonly visibleHeight: number },
  ) => Unsubscribe;
};

export type ThreadViewportStoreOptions = {
  turnAnchor?: "top" | "bottom" | undefined;
  topAnchorMessageClamp?:
    | {
        tallerThan?: string | undefined;
        visibleHeight?: string | undefined;
      }
    | undefined;
};

export const makeThreadViewportStore = (
  options: ThreadViewportStoreOptions = {},
) => {
  const scrollToBottomListeners = new Set<
    (config: { behavior: ScrollBehavior }) => void
  >();

  const viewportRegistry = createSizeRegistry((total) => {
    store.setState({
      height: {
        ...store.getState().height,
        viewport: total,
      },
    });
  });
  const insetRegistry = createSizeRegistry((total) => {
    store.setState({
      height: {
        ...store.getState().height,
        inset: total,
      },
    });
  });
  const registerElementSlot = (
    key: "viewport" | "anchor",
    element: HTMLElement | null,
  ) => {
    store.setState({
      element: {
        ...store.getState().element,
        [key]: element,
      },
    });

    return () => {
      if (store.getState().element[key] !== element) return;
      store.setState({
        element: {
          ...store.getState().element,
          [key]: null,
        },
      });
    };
  };

  const store = create<ThreadViewportState>(() => ({
    isAtBottom: true,
    scrollToBottom: ({ behavior = "auto" } = {}) => {
      for (const listener of scrollToBottomListeners) {
        listener({ behavior });
      }
    },
    onScrollToBottom: (callback) => {
      scrollToBottomListeners.add(callback);
      return () => {
        scrollToBottomListeners.delete(callback);
      };
    },

    turnAnchor: options.turnAnchor ?? "bottom",
    topAnchorMessageClamp: {
      tallerThan: options.topAnchorMessageClamp?.tallerThan ?? "10em",
      visibleHeight: options.topAnchorMessageClamp?.visibleHeight ?? "6em",
    },

    height: {
      viewport: 0,
      inset: 0,
    },
    element: {
      viewport: null,
      anchor: null,
      target: null,
    },
    targetConfig: null,

    registerViewport: viewportRegistry.register,
    registerContentInset: insetRegistry.register,
    registerViewportElement: (element) =>
      registerElementSlot("viewport", element),
    registerAnchorElement: (element) => registerElementSlot("anchor", element),
    registerAnchorTargetElement: (element, config) => {
      store.setState({
        element: {
          ...store.getState().element,
          target: element,
        },
        targetConfig: element && config ? config : null,
      });

      return () => {
        if (store.getState().element.target !== element) return;
        store.setState({
          element: {
            ...store.getState().element,
            target: null,
          },
          targetConfig: null,
        });
      };
    },
  }));

  return store;
};
