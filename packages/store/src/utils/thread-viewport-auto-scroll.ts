import {
  isViewportAtBottom,
  observeContentResize,
  viewportOverflows,
} from "./viewport-scroll";

const MESSAGE_SELECTOR = "[data-message-id]";
const DISCLOSURE_SELECTOR = "[aria-expanded], summary";
const TEXT_ENTRY_SELECTOR = [
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "input:not([type='checkbox']):not([type='radio']):not([type='button'])" +
    ":not([type='submit']):not([type='reset']):not([type='image'])" +
    ":not([type='range']):not([type='file']):not([type='color'])",
].join(", ");
const SCROLL_KEYS = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

const isOpeningDisclosure = (target: Element) => {
  const control = target.closest(DISCLOSURE_SELECTOR);
  if (!control) return false;
  if (control.tagName === "SUMMARY")
    return control.parentElement?.hasAttribute("open") === false;
  const popup = control.getAttribute("aria-haspopup");
  return (
    control.getAttribute("aria-expanded") === "false" &&
    (popup === null || popup === "false") &&
    control.getAttribute("role") !== "combobox"
  );
};

type MessageOffset = { readonly id: string; readonly offset: number };

const offsetInViewport = (element: Element, viewport: Element) =>
  element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;

const measureFirstMessage = (viewport: HTMLElement): MessageOffset | null => {
  const element = viewport.querySelector<HTMLElement>(MESSAGE_SELECTOR);
  const id = element?.dataset["messageId"];
  return element && id
    ? { id, offset: offsetInViewport(element, viewport) }
    : null;
};

const measureReaderMessage = (viewport: HTMLElement): MessageOffset | null => {
  const { top, bottom } = viewport.getBoundingClientRect();
  let spanning: MessageOffset | null = null;
  for (const element of viewport.querySelectorAll<HTMLElement>(
    MESSAGE_SELECTOR,
  )) {
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= top) continue;
    if (rect.top >= bottom) break;
    const id = element.dataset["messageId"];
    if (!id) continue;
    if (rect.top >= top) return { id, offset: rect.top - top };
    spanning ??= { id, offset: rect.top - top };
  }
  return spanning;
};

const findMessage = (viewport: HTMLElement, id: string) => {
  for (const element of viewport.querySelectorAll<HTMLElement>(
    MESSAGE_SELECTOR,
  )) {
    if (element.dataset["messageId"] === id) return element;
  }
  return null;
};

export type ThreadViewportAutoScrollOptions = {
  readonly autoScroll: boolean;
  readonly holdFollow?: boolean;
  readonly scrollToBottomOnInitialize: boolean;
  readonly scrollToBottomOnRunStart: boolean;
  readonly scrollToBottomOnThreadSwitch: boolean;
};

export type ThreadViewportAutoScroll = {
  attach(element: HTMLElement): () => void;
  readonly isAtBottom: boolean;
  scrollToBottom(behavior?: ScrollBehavior): void;
  messagesPrepended(previousFirstMessageId: string): void;
  setContentInset(inset: number): void;
  registerContentInset(): {
    setHeight(height: number): void;
    unregister(): void;
  };
  setHasMessages(hasMessages: boolean): void;
  runStarted(): void;
  threadSwitched(): void;
  dispose(): void;
};

export const createThreadViewportAutoScroll = (input: {
  getOptions: () => ThreadViewportAutoScrollOptions;
  onAtBottomChange: (isAtBottom: boolean) => void;
  onContentInsetChange?: (total: number) => void;
}): ThreadViewportAutoScroll => {
  let element: HTMLElement | null = null;
  let detachAttached: (() => void) | null = null;
  let intent: ScrollBehavior | null = null;
  let isAtBottom = true;
  let followBottom = true;
  let followPaused = false;
  let scrolledSincePause = false;
  let contentInset = 0;
  let directContentInset = 0;
  const contentInsetEntries = new Map<symbol, number>();
  let hasMessages = false;
  let initialized = false;
  let lastScrollTop = 0;
  let lastScrollHeight = 0;
  let lastObservedScrollHeight = 0;
  let lastObservedClientHeight = 0;
  let frame: number | null = null;
  let firstMessage: MessageOffset | null = null;
  let prependAnchor: MessageOffset | null = null;
  let heldScrollTop = 0;

  const keepMessageAt = (anchor: MessageOffset) => {
    if (!element) return false;
    const message = findMessage(element, anchor.id);
    if (!message) return false;
    const delta = offsetInViewport(message, element) - anchor.offset;
    heldScrollTop = element.scrollTop + delta;
    if (Math.abs(delta) >= 1) {
      element.scrollTo({ top: heldScrollTop, behavior: "instant" });
    }
    heldScrollTop = element.scrollTop;
    return true;
  };

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
    followBottom = true;
    followPaused = false;
    scrolledSincePause = false;
    intent = behavior;
    prependAnchor = null;
    element.scrollTo?.({ top: element.scrollHeight, behavior });
    lastScrollTop = element.scrollTop;
    lastScrollHeight = element.scrollHeight;
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

  const handleScroll = ({
    preserveFollow = false,
    insetShrank = false,
  }: { preserveFollow?: boolean; insetShrank?: boolean } = {}) => {
    if (!element) return;

    if (prependAnchor && Math.abs(element.scrollTop - heldScrollTop) >= 1)
      prependAnchor = null;

    const { autoScroll, holdFollow } = input.getOptions();
    const newIsAtBottom = isViewportAtBottom(element, contentInset);
    const scrolledUp =
      element.scrollTop < lastScrollTop &&
      element.scrollHeight >= lastScrollHeight;
    if (
      !holdFollow &&
      !newIsAtBottom &&
      (!autoScroll ||
        (!preserveFollow &&
          intent === null &&
          !followPaused &&
          (scrolledUp || insetShrank)))
    )
      followBottom = false;
    const inFlightDownward =
      intent !== null && !newIsAtBottom && lastScrollTop < element.scrollTop;
    if (!inFlightDownward) {
      if (newIsAtBottom) {
        // At-bottom is ambiguous without overflow, so intent stays alive until content can scroll.
        if (viewportOverflows(element, contentInset)) {
          intent = null;
          if (followPaused && scrolledSincePause) followPaused = false;
          scrolledSincePause = false;
        }
        followBottom = true;
      } else if (scrolledUp) {
        intent = null;
        cancelFrame();
        followBottom = false;
      }
      if (newIsAtBottom || intent === null) setAtBottom(newIsAtBottom);
    }

    lastScrollTop = element.scrollTop;
    lastScrollHeight = element.scrollHeight;
    firstMessage = measureFirstMessage(element);
  };

  const onScroll = () => handleScroll();

  const followGrowth = () => {
    if (frame !== null) return;
    const { autoScroll, holdFollow } = input.getOptions();
    if (intent && holdFollow) {
      intent = null;
    } else if (intent) {
      scrollToBottom(intent);
    } else if (!holdFollow && autoScroll && followBottom && !followPaused) {
      scrollToBottom("instant");
    } else if (prependAnchor && !keepMessageAt(prependAnchor)) {
      prependAnchor = null;
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

  const cancelPendingScrollToBottom = () => {
    if (intent === null && frame === null) return;
    intent = null;
    cancelFrame();
    handleScroll({ preserveFollow: true });
  };

  const cancelOnKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && !SCROLL_KEYS.has(event.key)) return;
    if ((event.target as Element | null)?.closest?.(TEXT_ENTRY_SELECTOR))
      return;
    cancelPendingScrollToBottom();
  };

  const pauseFollowOnExpand = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (
      !target?.closest?.(MESSAGE_SELECTOR) ||
      target.closest(TEXT_ENTRY_SELECTOR) ||
      !isOpeningDisclosure(target)
    )
      return;
    followPaused = true;
    scrolledSincePause = false;
    intent = null;
    cancelFrame();
  };

  const noteScrollGesture = (event: Event) => {
    if (event.type === "keydown") {
      const keyEvent = event as KeyboardEvent;
      if (!SCROLL_KEYS.has(keyEvent.key)) return;
      if ((event.target as Element | null)?.closest?.(TEXT_ENTRY_SELECTOR))
        return;
    } else if (event.type === "pointerdown" && event.target !== element) {
      return;
    }
    scrolledSincePause = true;
  };

  const releasePrependAnchor = () => {
    prependAnchor = null;
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

  const updateContentInset = () => {
    let inset = directContentInset;
    for (const height of contentInsetEntries.values()) inset += height;
    if (contentInset === inset) return;
    const grew = inset > contentInset;
    contentInset = inset;
    input.onContentInsetChange?.(inset);
    // A growing inset obscures pinned content and follows like a resize; a shrinking inset reveals content without moving the viewport.
    if (grew) followGrowth();
    handleScroll({ insetShrank: !grew });
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
      followBottom = true;
      followPaused = false;
      scrolledSincePause = false;
      firstMessage = null;
      prependAnchor = null;
      heldScrollTop = el.scrollTop;
      setAtBottom(true);
      const disconnect = observeContentResize(el, onContentResize);
      el.addEventListener("scroll", onScroll);
      el.addEventListener("pointerdown", cancelPendingScrollToBottom);
      el.addEventListener("wheel", cancelPendingScrollToBottom, {
        passive: true,
      });
      el.addEventListener("touchstart", cancelPendingScrollToBottom, {
        passive: true,
      });
      el.addEventListener("keydown", cancelOnKeyDown);
      el.addEventListener("click", pauseFollowOnExpand, true);
      for (const gesture of ["pointerdown", "wheel", "touchmove", "keydown"])
        el.addEventListener(gesture, noteScrollGesture, { passive: true });
      for (const gesture of ["pointerdown", "wheel", "touchstart", "keydown"])
        el.addEventListener(gesture, releasePrependAnchor, { passive: true });
      checkInitialize();
      if (contentInset > 0) followGrowth();
      const detach = () => {
        if (detachAttached !== detach) return;
        disconnect();
        el.removeEventListener("scroll", onScroll);
        el.removeEventListener("pointerdown", cancelPendingScrollToBottom);
        el.removeEventListener("wheel", cancelPendingScrollToBottom);
        el.removeEventListener("touchstart", cancelPendingScrollToBottom);
        el.removeEventListener("keydown", cancelOnKeyDown);
        el.removeEventListener("click", pauseFollowOnExpand, true);
        for (const gesture of [
          "pointerdown",
          "wheel",
          "touchmove",
          "keydown",
        ]) {
          el.removeEventListener(gesture, noteScrollGesture);
        }
        for (const gesture of [
          "pointerdown",
          "wheel",
          "touchstart",
          "keydown",
        ]) {
          el.removeEventListener(gesture, releasePrependAnchor);
        }
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
    messagesPrepended: (previousFirstMessageId) => {
      if (
        !element ||
        (input.getOptions().autoScroll && followBottom && !followPaused) ||
        intent !== null
      )
        return;
      const anchor = firstMessage;
      if (anchor?.id === previousFirstMessageId && keepMessageAt(anchor)) {
        prependAnchor = measureReaderMessage(element) ?? anchor;
      } else {
        const top = element.scrollHeight - (lastScrollHeight - lastScrollTop);
        if (Math.abs(element.scrollTop - top) >= 1)
          element.scrollTo({ top, behavior: "instant" });
      }
      lastScrollTop = element.scrollTop;
      lastScrollHeight = element.scrollHeight;
    },
    setContentInset: (inset) => {
      if (directContentInset === inset) return;
      directContentInset = inset;
      updateContentInset();
    },
    registerContentInset: () => {
      const id = Symbol();
      contentInsetEntries.set(id, 0);
      return {
        setHeight: (height) => {
          if (
            !contentInsetEntries.has(id) ||
            contentInsetEntries.get(id) === height
          )
            return;
          contentInsetEntries.set(id, height);
          updateContentInset();
        },
        unregister: () => {
          if (!contentInsetEntries.delete(id)) return;
          updateContentInset();
        },
      };
    },
    setHasMessages: (value) => {
      hasMessages = value;
      checkInitialize();
    },
    runStarted: () => {
      prependAnchor = null;
      followPaused = false;
      scrolledSincePause = false;
      if (input.getOptions().scrollToBottomOnRunStart)
        scheduleScrollToBottom("auto");
    },
    threadSwitched: () => {
      prependAnchor = null;
      followPaused = false;
      scrolledSincePause = false;
      if (input.getOptions().scrollToBottomOnThreadSwitch)
        scheduleScrollToBottom("instant");
    },
    dispose: () => {
      detachAttached?.();
      cancelFrame();
    },
  };
};
