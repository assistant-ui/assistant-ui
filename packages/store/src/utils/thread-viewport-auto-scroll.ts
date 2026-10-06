import {
  isUserScrollUp,
  isViewportAtBottom,
  observeContentResize,
  viewportOverflows,
} from "./viewport-scroll";

export type ThreadViewportAutoScrollOptions = {
  readonly autoScroll: boolean;
  readonly scrollToBottomOnInitialize: boolean;
  readonly scrollToBottomOnRunStart: boolean;
  readonly scrollToBottomOnThreadSwitch: boolean;
};

export type ThreadViewportAutoScroll = {
  attach(element: HTMLElement): () => void;
  readonly isAtBottom: boolean;
  scrollToBottom(behavior?: ScrollBehavior): void;
  setContentInset(inset: number): void;
  setHasMessages(hasMessages: boolean): void;
  runStarted(): void;
  threadSwitched(): void;
  dispose(): void;
};

export const createThreadViewportAutoScroll = (input: {
  getOptions: () => ThreadViewportAutoScrollOptions;
  onAtBottomChange: (isAtBottom: boolean) => void;
}): ThreadViewportAutoScroll => {
  let element: HTMLElement | null = null;
  let detachAttached: (() => void) | null = null;
  let intent: ScrollBehavior | null = null;
  let isAtBottom = true;
  let contentInset = 0;
  let hasMessages = false;
  let initialized = false;
  let lastScrollTop = 0;
  let lastScrollHeight = 0;
  let lastObservedScrollHeight = 0;
  let lastObservedClientHeight = 0;
  let frame: number | null = null;

  const setAtBottom = (value: boolean) => {
    if (value === isAtBottom) return;
    isAtBottom = value;
    input.onAtBottomChange(value);
  };

  const cancelFrame = () => {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (!element) return;
    intent = behavior;
    element.scrollTo?.({ top: element.scrollHeight, behavior });
  };

  const scheduleScrollToBottom = (behavior: ScrollBehavior) => {
    intent = behavior;
    // Initialization can run during SSR, where no frame scheduler exists.
    if (typeof requestAnimationFrame === "undefined") return;
    cancelFrame();
    frame = requestAnimationFrame(() => {
      frame = null;
      scrollToBottom(behavior);
    });
  };

  const handleScroll = () => {
    if (!element) return;

    const newIsAtBottom = isViewportAtBottom(element, contentInset);
    const inFlightDownward =
      !newIsAtBottom && lastScrollTop < element.scrollTop;
    if (!inFlightDownward) {
      if (newIsAtBottom) {
        // At-bottom is ambiguous without overflow, so intent stays alive until content can scroll.
        if (viewportOverflows(element, contentInset)) intent = null;
      } else if (
        isUserScrollUp(
          { scrollTop: lastScrollTop, scrollHeight: lastScrollHeight },
          element,
        )
      ) {
        intent = null;
        cancelFrame();
      }
      if (newIsAtBottom || intent === null) setAtBottom(newIsAtBottom);
    }

    lastScrollTop = element.scrollTop;
    lastScrollHeight = element.scrollHeight;
  };

  const followGrowth = () => {
    if (intent) {
      scrollToBottom(intent);
    } else if (input.getOptions().autoScroll && isAtBottom) {
      scrollToBottom("instant");
    }
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

    followGrowth();
    handleScroll();
  };

  // A pointer gesture clears retained intent and a queued frame so neither can hijack the next content growth.
  const onPointerdown = () => {
    intent = null;
    cancelFrame();
  };

  const checkInitialize = () => {
    if (!hasMessages) {
      initialized = false;
      return;
    }
    if (!input.getOptions().scrollToBottomOnInitialize || initialized) return;
    initialized = true;
    if (intent !== null) return;
    scheduleScrollToBottom("instant");
  };

  return {
    attach: (el) => {
      detachAttached?.();
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
      if (contentInset > 0) followGrowth();
      const detach = () => {
        if (detachAttached !== detach) return;
        disconnect();
        el.removeEventListener("scroll", handleScroll);
        el.removeEventListener("pointerdown", onPointerdown);
        cancelFrame();
        if (element === el) element = null;
        detachAttached = null;
      };
      detachAttached = detach;
      return detach;
    },
    get isAtBottom() {
      return isAtBottom;
    },
    scrollToBottom,
    setContentInset: (inset) => {
      if (contentInset === inset) return;
      const grew = inset > contentInset;
      contentInset = inset;
      // A growing inset obscures pinned content and follows like a resize; a shrinking inset reveals content without moving the viewport.
      if (grew) followGrowth();
      handleScroll();
    },
    setHasMessages: (value) => {
      hasMessages = value;
      checkInitialize();
    },
    runStarted: () => {
      if (input.getOptions().scrollToBottomOnRunStart)
        scheduleScrollToBottom("auto");
    },
    threadSwitched: () => {
      if (input.getOptions().scrollToBottomOnThreadSwitch)
        scheduleScrollToBottom("instant");
    },
    dispose: () => {
      detachAttached?.();
      cancelFrame();
    },
  };
};
