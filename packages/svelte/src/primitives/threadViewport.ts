import { onDestroy } from "svelte";
import { createSubscriber } from "svelte/reactivity";
import { getAuiContext } from "../context";
import { useAuiEvent } from "../useAuiEvent";
import { useAuiState } from "../useAuiState";
import { createThreadViewportAutoScroll } from "@assistant-ui/store/client";

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
  const contentInsetEntries = new Map<symbol, number>();
  const atBottomListeners = new Set<() => void>();
  const subscribeAtBottom = createSubscriber((update) => {
    atBottomListeners.add(update);
    return () => atBottomListeners.delete(update);
  });
  const autoScrollController = createThreadViewportAutoScroll({
    getOptions: () => ({
      autoScroll,
      scrollToBottomOnInitialize,
      scrollToBottomOnRunStart,
      scrollToBottomOnThreadSwitch,
    }),
    onAtBottomChange: () => {
      for (const listener of atBottomListeners) listener();
    },
  });
  const updateContentInset = () => {
    let total = 0;
    for (const height of contentInsetEntries.values()) total += height;
    autoScrollController.setContentInset(total);
  };

  const registerContentInset = () => {
    const id = Symbol();
    contentInsetEntries.set(id, 0);

    return {
      setHeight: (height: number) => {
        if (contentInsetEntries.get(id) === height) return;
        contentInsetEntries.set(id, height);
        updateContentInset();
      },
      unregister: () => {
        if (!contentInsetEntries.delete(id)) return;
        updateContentInset();
      },
    };
  };

  const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
  const checkInitialize = () =>
    autoScrollController.setHasMessages(hasMessages.current);
  checkInitialize();
  const unsubscribeState = context.source.subscribe(checkInitialize);
  onDestroy(() => {
    unsubscribeState();
    autoScrollController.dispose();
  });

  useAuiEvent("thread.runStart", () => autoScrollController.runStarted());
  useAuiEvent("threads.selectionChanged", () =>
    autoScrollController.threadSwitched(),
  );

  return {
    attach: (el: HTMLElement) => autoScrollController.attach(el),
    get isAtBottom() {
      subscribeAtBottom();
      return autoScrollController.isAtBottom;
    },
    scrollToBottom: (behavior: ScrollBehavior = "auto") =>
      autoScrollController.scrollToBottom(behavior),
    registerContentInset,
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
