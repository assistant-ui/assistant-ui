import {
  createComponent,
  createEffect,
  createSignal,
  mergeProps,
  on,
  onCleanup,
  onMount,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type {} from "@assistant-ui/core/store";
import { createThreadViewportAutoScroll } from "@assistant-ui/store/client";
import { useAuiEvent } from "../useAuiEvent";
import { useAuiState } from "../useAuiState";
import { ViewportContext } from "./viewportContext";

/**
 * A scrollable container that keeps the thread pinned to the bottom: content growth scrolls back down while the user sits at the bottom, a run start scrolls down, and scrolling up unpins until the user returns to the bottom.
 *
 * The four options mirror the React hook and are independent: `autoScroll` covers follow-on-content-growth, and the other three gate the first-messages, run-start, and thread-switch scrolls. Provides the scroll-to-bottom channel that {@link ThreadPrimitiveScrollToBottom} drives; the React viewport's top-anchor system stays in the React viewport store and is not ported.
 */
export const ThreadPrimitiveViewport = (
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    autoScroll?: boolean;
    scrollToBottomOnInitialize?: boolean;
    scrollToBottomOnRunStart?: boolean;
    scrollToBottomOnThreadSwitch?: boolean;
  },
): JSX.Element => {
  const [local, rest] = splitProps(props, [
    "ref",
    "autoScroll",
    "scrollToBottomOnInitialize",
    "scrollToBottomOnRunStart",
    "scrollToBottomOnThreadSwitch",
  ]);
  let div!: HTMLDivElement;
  const [isAtBottom, setIsAtBottom] = createSignal(true);
  const autoScroll = createThreadViewportAutoScroll({
    getOptions: () => ({
      autoScroll: local.autoScroll ?? true,
      scrollToBottomOnInitialize: local.scrollToBottomOnInitialize ?? true,
      scrollToBottomOnRunStart: local.scrollToBottomOnRunStart ?? true,
      scrollToBottomOnThreadSwitch: local.scrollToBottomOnThreadSwitch ?? true,
    }),
    onAtBottomChange: setIsAtBottom,
  });

  let detach: (() => void) | undefined;
  onMount(() => {
    detach = autoScroll.attach(div);
  });
  onCleanup(() => {
    detach?.();
    autoScroll.dispose();
  });

  const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
  createEffect(
    on([hasMessages, () => local.scrollToBottomOnInitialize], ([has]) =>
      autoScroll.setHasMessages(has),
    ),
  );

  useAuiEvent("thread.runStart", () => autoScroll.runStarted());
  useAuiEvent("threads.selectionChanged", () => autoScroll.threadSwitched());

  return createComponent(ViewportContext.Provider, {
    value: {
      isAtBottom,
      scrollToBottom: (behavior: ScrollBehavior = "auto") =>
        autoScroll.scrollToBottom(behavior),
      registerContentInset: autoScroll.registerContentInset,
    },
    get children() {
      return createComponent(
        Dynamic,
        mergeProps(rest, {
          component: "div",
          ref: (element: HTMLDivElement) => {
            div = element;
            if (typeof local.ref === "function") local.ref(element);
          },
        }),
      );
    },
  });
};
