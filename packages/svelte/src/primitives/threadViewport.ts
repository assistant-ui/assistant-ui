import { onDestroy } from "svelte";
import { createSubscriber } from "svelte/reactivity";
import { getAuiContext } from "../context";
import { useAuiEvent } from "../useAuiEvent";
import { useAuiState } from "../useAuiState";
import {
  isUserScrollUp,
  isViewportAtBottom,
  observeContentResize,
  viewportOverflows,
} from "@assistant-ui/store/client";

/**
 * Builder for the scrollable thread container. Call during component
 * initialization and attach to the element with `{@attach viewport.attach}`.
 *
 * Keeps the thread pinned to the bottom: content growth scrolls back down
 * while the user sits at the bottom, a run start scrolls down, and scrolling
 * up unpins until the user returns to the bottom. The four options mirror the
 * react hook and are independent: `autoScroll` covers
 * follow-on-content-growth, and the other three gate the first-messages,
 * run-start, and thread-switch scrolls. `isAtBottom` and `scrollToBottom`
 * form the channel {@link threadScrollToBottom} drives.
 */
export const threadViewport = (options?: {
  autoScroll?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnRunStart?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
}) => {
  const autoScroll = options?.autoScroll ?? true;
  const scrollToBottomOnInitialize =
    options?.scrollToBottomOnInitialize ?? true;
  const scrollToBottomOnRunStart = options?.scrollToBottomOnRunStart ?? true;
  const scrollToBottomOnThreadSwitch =
    options?.scrollToBottomOnThreadSwitch ?? true;
  const context = getAuiContext();

  let element: HTMLElement | null = null;
  let intent: ScrollBehavior | null = null;
  let lastScrollTop = 0;
  let lastScrollHeight = 0;
  let lastObservedScrollHeight = 0;
  let lastObservedClientHeight = 0;
  let frame: number | null = null;

  let atBottom = true;
  const atBottomListeners = new Set<() => void>();
  const setAtBottom = (value: boolean) => {
    if (value === atBottom) return;
    atBottom = value;
    for (const listener of atBottomListeners) listener();
  };
  const subscribeAtBottom = createSubscriber((update) => {
    atBottomListeners.add(update);
    return () => atBottomListeners.delete(update);
  });

  const scrollToBottom = (behavior: ScrollBehavior) => {
    if (!element) return;
    intent = behavior;
    element.scrollTo?.({ top: element.scrollHeight, behavior });
  };

  const scheduleScrollToBottom = (behavior: ScrollBehavior) => {
    intent = behavior;
    if (typeof requestAnimationFrame === "undefined") return;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = null;
      scrollToBottom(behavior);
    });
  };

  const handleScroll = () => {
    if (!element) return;

    const newIsAtBottom = isViewportAtBottom(element);
    const inFlightDownward =
      !newIsAtBottom && lastScrollTop < element.scrollTop;
    if (!inFlightDownward) {
      if (newIsAtBottom) {
        // At-bottom is ambiguous while the viewport does not overflow; keep
        // the intent alive until content can actually scroll.
        if (viewportOverflows(element)) intent = null;
      } else if (
        isUserScrollUp(
          { scrollTop: lastScrollTop, scrollHeight: lastScrollHeight },
          element,
        )
      ) {
        intent = null;
      }
      if (newIsAtBottom || intent === null) setAtBottom(newIsAtBottom);
    }

    lastScrollTop = element.scrollTop;
    lastScrollHeight = element.scrollHeight;
  };

  const onContentResize = () => {
    if (!element) return;
    const { scrollHeight, clientHeight } = element;
    if (
      scrollHeight === lastObservedScrollHeight &&
      clientHeight === lastObservedClientHeight
    ) {
      return;
    }
    lastObservedScrollHeight = scrollHeight;
    lastObservedClientHeight = clientHeight;

    if (intent) {
      scrollToBottom(intent);
    } else if (autoScroll && atBottom) {
      scrollToBottom("instant");
    }
    handleScroll();
  };

  // A pointer gesture invalidates pending bottom-scroll intent; otherwise an
  // intent kept alive by a non-overflowing thread hijacks the next content
  // growth. An already scheduled frame is cancelled too, so the gesture also
  // wins the race against a just-planted intent.
  const onPointerdown = () => {
    intent = null;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
  let initialized = false;
  const checkInitialize = () => {
    if (!hasMessages.current) {
      initialized = false;
      return;
    }
    if (!scrollToBottomOnInitialize || initialized) return;
    initialized = true;
    if (intent !== null) return;
    scheduleScrollToBottom("instant");
  };
  const unsubscribeState = context.source.subscribe(checkInitialize);
  onDestroy(() => {
    unsubscribeState();
    if (frame !== null) cancelAnimationFrame(frame);
  });

  useAuiEvent("thread.runStart", () => {
    if (!scrollToBottomOnRunStart) return;
    scheduleScrollToBottom("auto");
  });

  useAuiEvent("threads.selectionChanged", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    scheduleScrollToBottom("instant");
  });

  return {
    attach: (el: HTMLElement) => {
      // The builder outlives its element, so each attachment restarts the
      // per-element bookkeeping as a fresh mount would.
      element = el;
      intent = null;
      lastScrollTop = el.scrollTop;
      lastScrollHeight = el.scrollHeight;
      lastObservedScrollHeight = 0;
      lastObservedClientHeight = 0;
      initialized = false;
      setAtBottom(true);
      const disconnect = observeContentResize(el, onContentResize);
      el.addEventListener("scroll", handleScroll);
      el.addEventListener("pointerdown", onPointerdown);
      checkInitialize();
      handleScroll();
      return () => {
        disconnect();
        el.removeEventListener("scroll", handleScroll);
        el.removeEventListener("pointerdown", onPointerdown);
        if (frame !== null) {
          cancelAnimationFrame(frame);
          frame = null;
        }
        if (element === el) element = null;
      };
    },
    get isAtBottom() {
      subscribeAtBottom();
      return atBottom;
    },
    scrollToBottom: (behavior: ScrollBehavior = "auto") =>
      scrollToBottom(behavior),
  };
};

/**
 * Builder for the scroll-to-bottom button. Spread `props` onto a `<button>`.
 * Takes the viewport it drives explicitly; disabled while the viewport sits
 * at the bottom. Caller handlers compose the same way as `composerSend`.
 */
export const threadScrollToBottom = (options: {
  viewport: ReturnType<typeof threadViewport>;
}) => {
  const { viewport } = options;
  return {
    props: {
      type: "button" as const,
      get disabled() {
        return viewport.isAtBottom;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented || viewport.isAtBottom) return;
        viewport.scrollToBottom("auto");
      },
    },
  };
};
