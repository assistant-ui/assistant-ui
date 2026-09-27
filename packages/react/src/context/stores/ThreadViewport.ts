"use client";

import { create } from "zustand";
import type { Unsubscribe } from "@assistant-ui/core";
import { notifyEventListeners } from "@assistant-ui/core/internal";

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

  /** Whether auto-scrolling on content growth is paused. */
  readonly autoScrollPaused: boolean;

  /**
   * Pause auto-scrolling on content growth.
   *
   * Multiple callers can hold a pause concurrently. Auto-scrolling remains
   * paused until every returned release function has been called, or until
   * an explicit `resumeAutoScroll()` or `scrollToBottom()`.
   *
   * @returns A release function that unregisters this pause holder.
   *
   * @example
   * ```tsx
   * const pauseAutoScroll = useThreadViewport((s) => s.pauseAutoScroll);
   *
   * useEffect(() => {
   *   if (!isExpanded) return;
   *   const unpause = pauseAutoScroll();
   *   return () => unpause();
   * }, [isExpanded, pauseAutoScroll]);
   * ```
   */
  readonly pauseAutoScroll: () => Unsubscribe;

  /**
   * Resume auto-scrolling immediately, clearing all active pause holders.
   */
  readonly resumeAutoScroll: () => void;
  readonly scrollToBottom: (config?: {
    behavior?: ScrollBehavior | undefined;
  }) => void;
  readonly onScrollToBottom: (
    callback: ({ behavior }: { behavior: ScrollBehavior }) => void,
  ) => Unsubscribe;
  readonly onPauseAutoScroll: (callback: () => Unsubscribe) => Unsubscribe;
  readonly onResumeAutoScroll: (callback: () => void) => Unsubscribe;

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

  /**
   * The current top-anchor turn activated in this viewport session.
   * History-loaded messages do not populate this; it is set when a run creates
   * a live user/assistant pair and remains after the run completes.
   */
  readonly topAnchorTurn: {
    readonly anchorId: string;
    readonly targetId: string;
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

  readonly setTopAnchorTurn: (
    turn: { readonly anchorId: string; readonly targetId: string } | null,
  ) => void;
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
  const pauseAutoScrollListeners = new Set<() => Unsubscribe>();
  const resumeAutoScrollListeners = new Set<() => void>();

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

  const pauseHolders = new Set<symbol>();

  const store = create<ThreadViewportState>(() => ({
    isAtBottom: true,
    autoScrollPaused: false,
    pauseAutoScroll: () => {
      if (pauseAutoScrollListeners.size > 0) {
        const unsubs: Unsubscribe[] = [];
        for (const listener of pauseAutoScrollListeners) {
          unsubs.push(listener());
        }
        return () => {
          for (const unsub of unsubs) {
            unsub();
          }
        };
      }
      const id = Symbol();
      pauseHolders.add(id);
      store.setState({ autoScrollPaused: true });
      return () => {
        pauseHolders.delete(id);
        if (pauseHolders.size === 0) {
          store.setState({ autoScrollPaused: false });
        }
      };
    },
    resumeAutoScroll: () => {
      pauseHolders.clear();
      store.setState({ autoScrollPaused: false });
      notifyEventListeners(
        resumeAutoScrollListeners,
        undefined,
        "Thread viewport",
      );
    },
    scrollToBottom: ({ behavior = "auto" } = {}) => {
      pauseHolders.clear();
      store.setState({ autoScrollPaused: false });
      notifyEventListeners(
        scrollToBottomListeners,
        () => ({ behavior }),
        "Thread viewport",
      );
    },
    onScrollToBottom: (callback) => {
      scrollToBottomListeners.add(callback);
      return () => {
        scrollToBottomListeners.delete(callback);
      };
    },
    onPauseAutoScroll: (callback) => {
      pauseAutoScrollListeners.add(callback);
      let releaseExisting: Unsubscribe | null = null;
      if (pauseHolders.size > 0) {
        releaseExisting = callback();
      }
      return () => {
        pauseAutoScrollListeners.delete(callback);
        if (releaseExisting) {
          releaseExisting();
          releaseExisting = null;
        }
      };
    },
    onResumeAutoScroll: (callback) => {
      resumeAutoScrollListeners.add(callback);
      return () => {
        resumeAutoScrollListeners.delete(callback);
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
    topAnchorTurn: null,

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
    setTopAnchorTurn: (topAnchorTurn) => {
      store.setState({ topAnchorTurn });
    },
  }));

  return store;
};
