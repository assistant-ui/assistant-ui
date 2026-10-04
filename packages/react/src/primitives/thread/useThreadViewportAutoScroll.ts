"use client";

import { useComposedRefs } from "radix-ui/internal";
import { useCallback, useLayoutEffect, useRef, type RefCallback } from "react";
import { useAui, useAuiEvent, useAuiState } from "@assistant-ui/store";
import {
  isUserScrollUp,
  isViewportAtBottom,
  viewportOverflows,
} from "@assistant-ui/store/client";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { writableStore } from "../../context/ReadonlyStore";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";

// Enter and Space activate a focused control, which is how a collapsible tool
// call expands without a pointer event ever firing. No other key changes thread
// content: the keys that scroll the viewport reach handleScroll, which already
// clears the intent when the user scrolls up.
const ACTIVATION_KEYS = new Set(["Enter", " "]);

// A control that consumes the activation key itself instead of acting on thread
// content. `contenteditable="false"` marks a non-editable island inside an
// editable tree, so it is excluded the way ComposerRoot already excludes it;
// the input types left out are the ones a key activates rather than fills.
const TEXT_ENTRY_SELECTOR = [
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "input:not([type='checkbox']):not([type='radio']):not([type='button'])" +
    ":not([type='submit']):not([type='reset']):not([type='image'])" +
    ":not([type='range']):not([type='file']):not([type='color'])",
].join(", ");

const MESSAGE_SELECTOR = "[data-message-id]";

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

/** The first message that starts in view, else the one spanning its top edge. */
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

/**
 * Scrolls so the message sits at `anchor.offset` again, recording the
 * position it scrolls to in `heldScrollTop` before the scroll event can
 * report it; false when the message is gone.
 */
const keepMessageAt = (
  viewport: HTMLElement,
  anchor: MessageOffset,
  heldScrollTop: { current: number },
) => {
  const element = findMessage(viewport, anchor.id);
  if (!element) return false;
  const delta = offsetInViewport(element, viewport) - anchor.offset;
  heldScrollTop.current = viewport.scrollTop + delta;
  if (Math.abs(delta) >= 1) {
    viewport.scrollTo({ top: heldScrollTop.current, behavior: "instant" });
  }
  heldScrollTop.current = viewport.scrollTop;
  return true;
};

export namespace useThreadViewportAutoScroll {
  export type Options = {
    /**
     * Whether to automatically scroll to the bottom when new messages are added.
     * When enabled, the viewport will automatically scroll to show the latest content.
     *
     * Default false if `turnAnchor` is "top", otherwise defaults to true.
     */
    autoScroll?: boolean | undefined;

    /**
     * Whether to scroll to bottom when a new run starts.
     *
     * Defaults to true.
     */
    scrollToBottomOnRunStart?: boolean | undefined;

    /**
     * Whether to scroll to bottom when messages first appear in the thread.
     *
     * Defaults to true.
     */
    scrollToBottomOnInitialize?: boolean | undefined;

    /**
     * Whether to scroll to bottom when switching to a different thread.
     *
     * Defaults to true.
     */
    scrollToBottomOnThreadSwitch?: boolean | undefined;
  };
}

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const aui = useAui();
  const divRef = useRef<TElement>(null);
  const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
  const firstMessageId = useAuiState((s) => s.thread.messages[0]?.id);
  const threadId = useAuiState((s) => s.threadListItem.id);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const initializeScrollRequestedRef = useRef(false);
  const scheduledFrameRef = useRef<number | null>(null);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== "top";
  }

  const lastScrollTop = useRef<number>(0);
  const lastScrollHeight = useRef<number>(0);
  const lastObservedScrollHeight = useRef<number>(0);
  const lastObservedClientHeight = useRef<number>(0);
  const firstMessageRef = useRef<MessageOffset | null>(null);
  // The row the reader sees when earlier messages land, held until a gesture
  // or a scroll this hook did not make, so content above it that settles
  // afterwards (lazy layout, late media) does not move it on engines without
  // native scroll anchoring.
  const prependAnchorRef = useRef<MessageOffset | null>(null);
  const heldScrollTopRef = useRef(0);

  // Pending bottom-scroll intent. Planted by initialize/run-start/switch/button
  // triggers, cleared when handleScroll confirms we reached bottom, or when the
  // user actively scrolls up while content size is stable.
  const scrollingToBottomBehaviorRef = useRef<ScrollBehavior | null>(null);
  const followBottomRef = useRef(autoScroll);
  const previousAutoScrollRef = useRef(autoScroll);

  useLayoutEffect(() => {
    const previousAutoScroll = previousAutoScrollRef.current;
    previousAutoScrollRef.current = autoScroll;
    if (previousAutoScroll || !autoScroll) return;

    const div = divRef.current;
    followBottomRef.current = div !== null && isViewportAtBottom(div);
  }, [autoScroll]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    followBottomRef.current = true;
    scrollingToBottomBehaviorRef.current = behavior;
    prependAnchorRef.current = null;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const cancelScheduledFrame = useCallback(() => {
    if (scheduledFrameRef.current === null) return;
    cancelAnimationFrame(scheduledFrameRef.current);
    scheduledFrameRef.current = null;
  }, []);

  const scheduleScrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      scrollingToBottomBehaviorRef.current = behavior;
      cancelScheduledFrame();
      scheduledFrameRef.current = requestAnimationFrame(() => {
        scheduledFrameRef.current = null;
        scrollToBottom(behavior);
      });
    },
    [cancelScheduledFrame, scrollToBottom],
  );

  useLayoutEffect(() => () => cancelScheduledFrame(), [cancelScheduledFrame]);

  const hasActiveTopAnchor = useCallback(() => {
    const state = threadViewportStore.getState();
    return (
      state.turnAnchor === "top" &&
      state.element.viewport === divRef.current &&
      state.element.anchor !== null
    );
  }, [threadViewportStore]);

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    if (
      prependAnchorRef.current &&
      Math.abs(div.scrollTop - heldScrollTopRef.current) >= 1
    ) {
      prependAnchorRef.current = null;
    }

    const isAtBottom = threadViewportStore.getState().isAtBottom;
    const newIsAtBottom = isViewportAtBottom(div);

    const isInFlightDownwardScroll =
      scrollingToBottomBehaviorRef.current !== null &&
      !newIsAtBottom &&
      lastScrollTop.current < div.scrollTop;
    if (isInFlightDownwardScroll) {
      // no-op: a smooth scroll-to-bottom fires many midpoint scroll events
      // before landing, don't flicker isAtBottom or clear intent mid-animation
    } else {
      const userScrolledUp = isUserScrollUp(
        {
          scrollTop: lastScrollTop.current,
          scrollHeight: lastScrollHeight.current,
        },
        div,
      );

      if (newIsAtBottom) {
        // newIsAtBottom is ambiguous when the viewport doesn't overflow —
        // keep intent alive until content can actually scroll
        if (viewportOverflows(div)) {
          scrollingToBottomBehaviorRef.current = null;
        }
        if (autoScroll) followBottomRef.current = true;
      } else if (userScrolledUp) {
        cancelScheduledFrame();
        scrollingToBottomBehaviorRef.current = null;
        followBottomRef.current = false;
      }

      const shouldUpdate =
        newIsAtBottom || scrollingToBottomBehaviorRef.current === null;

      if (shouldUpdate && newIsAtBottom !== isAtBottom) {
        writableStore(threadViewportStore).setState({
          isAtBottom: newIsAtBottom,
        });
      }
    }

    lastScrollTop.current = div.scrollTop;
    lastScrollHeight.current = div.scrollHeight;
    firstMessageRef.current = measureFirstMessage(div);
  };

  const resizeRef = useOnResizeContent(() => {
    const div = divRef.current;
    if (!div) return;

    const { scrollHeight, clientHeight } = div;
    if (
      scrollHeight === lastObservedScrollHeight.current &&
      clientHeight === lastObservedClientHeight.current
    ) {
      return;
    }
    lastObservedScrollHeight.current = scrollHeight;
    lastObservedClientHeight.current = clientHeight;

    const scrollBehavior = scrollingToBottomBehaviorRef.current;
    if (scrollBehavior && hasActiveTopAnchor()) {
      // Let the top-anchor reserve own scrolling while a run starts to avoid a bottom-scroll race.
      scrollingToBottomBehaviorRef.current = null;
    } else if (scrollBehavior) {
      scrollToBottom(scrollBehavior);
    } else if (
      autoScroll &&
      !(isRunning && hasActiveTopAnchor()) &&
      followBottomRef.current
    ) {
      scrollToBottom("instant");
    } else if (
      prependAnchorRef.current &&
      !keepMessageAt(div, prependAnchorRef.current, heldScrollTopRef)
    ) {
      prependAnchorRef.current = null;
    }

    handleScroll();
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    // A user gesture invalidates pending bottom-scroll intent; otherwise an
    // intent kept alive by a non-overflowing thread (see handleScroll) hijacks
    // the next content growth, e.g. expanding a collapsible tool call. Keyboard
    // activation reaches that same content without ever emitting a pointer
    // event, so it has to cancel the intent too.
    const cancelPendingScrollToBottom = () => {
      // A scheduled frame re-plants the intent when it runs, so clearing the
      // ref alone leaves the gesture undone.
      cancelScheduledFrame();
      scrollingToBottomBehaviorRef.current = null;
    };
    // The composer renders inside the viewport, so its keystrokes bubble here;
    // only an activation key aimed at something other than a text field is a
    // gesture on thread content.
    const cancelOnKeyDown = (event: KeyboardEvent) => {
      if (!ACTIVATION_KEYS.has(event.key)) return;
      const target = event.target as Element | null;
      if (target?.closest?.(TEXT_ENTRY_SELECTOR)) return;
      cancelPendingScrollToBottom();
    };
    const releasePrependAnchor = () => {
      prependAnchorRef.current = null;
    };
    const gestures = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    el.addEventListener("scroll", handleScroll);
    el.addEventListener("pointerdown", cancelPendingScrollToBottom);
    el.addEventListener("wheel", cancelPendingScrollToBottom, {
      passive: true,
    });
    el.addEventListener("keydown", cancelOnKeyDown);
    for (const gesture of gestures) {
      el.addEventListener(gesture, releasePrependAnchor, { passive: true });
    }
    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("pointerdown", cancelPendingScrollToBottom);
      el.removeEventListener("wheel", cancelPendingScrollToBottom);
      el.removeEventListener("keydown", cancelOnKeyDown);
      for (const gesture of gestures) {
        el.removeEventListener(gesture, releasePrependAnchor);
      }
    };
  });

  // Earlier messages prepended above the reader put the old first message back
  // where the reader saw it, so growth below it in the same commit (a
  // streaming reply) is not mistaken for the page; where the browser already
  // anchored the scroll, this is a no-op.
  const previousRef = useRef({ threadId, firstMessageId });
  useLayoutEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { threadId, firstMessageId };
    if (previous.threadId !== threadId) {
      prependAnchorRef.current = null;
      return;
    }
    const div = divRef.current;
    const previousFirstMessageId = previous.firstMessageId;
    if (
      !div ||
      previousFirstMessageId === undefined ||
      previousFirstMessageId === firstMessageId ||
      (autoScroll && followBottomRef.current) ||
      scrollingToBottomBehaviorRef.current !== null
    )
      return;
    const prepended = aui.thread
      .getState()
      .messages.some(
        (message, index) => index > 0 && message.id === previousFirstMessageId,
      );
    if (!prepended) return;

    const anchor = firstMessageRef.current;
    if (
      anchor?.id === previousFirstMessageId &&
      keepMessageAt(div, anchor, heldScrollTopRef)
    ) {
      prependAnchorRef.current = measureReaderMessage(div) ?? anchor;
    } else {
      // Message roots that render no `data-message-id` leave only the total
      // growth to go on, which counts any growth below the reader too.
      const top =
        div.scrollHeight - (lastScrollHeight.current - lastScrollTop.current);
      if (Math.abs(div.scrollTop - top) >= 1) {
        div.scrollTo({ top, behavior: "instant" });
      }
    }
    lastScrollTop.current = div.scrollTop;
    lastScrollHeight.current = div.scrollHeight;
  }, [aui, autoScroll, firstMessageId, threadId]);

  useLayoutEffect(() => {
    if (!scrollToBottomOnInitialize) return;
    if (!hasMessages) {
      initializeScrollRequestedRef.current = false;
      return;
    }
    if (initializeScrollRequestedRef.current) return;

    initializeScrollRequestedRef.current = true;
    // defer to an in-flight run (e.g. first message on a new thread) that
    // already planted intent — otherwise we'd downgrade its "auto" to "instant"
    if (scrollingToBottomBehaviorRef.current !== null) return;
    scheduleScrollToBottom("instant");
  }, [hasMessages, scheduleScrollToBottom, scrollToBottomOnInitialize]);

  useOnScrollToBottom(({ behavior }) => {
    scrollToBottom(behavior);
  });

  useAuiEvent("thread.runStart", () => {
    prependAnchorRef.current = null;
    if (!scrollToBottomOnRunStart) return;
    if (threadViewportStore.getState().turnAnchor === "top") return;
    scheduleScrollToBottom("auto");
  });

  useAuiEvent("threads.selectionChanged", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    scheduleScrollToBottom("instant");
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
