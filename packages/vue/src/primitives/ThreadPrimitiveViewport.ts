import {
  defineComponent,
  h,
  onMounted,
  onScopeDispose,
  provide,
  shallowRef,
  watch,
  type SlotsType,
  type VNodeChild,
} from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiEvent } from "../useAuiEvent";
import { useAuiState } from "../useAuiState";
import {
  isUserScrollUp,
  isViewportAtBottom,
  observeContentResize,
  viewportOverflows,
} from "@assistant-ui/store/client";
import { viewportInjectionKey } from "./viewportContext";

/**
 * A scrollable container that keeps the thread pinned to the bottom: content
 * growth scrolls back down while the user sits at the bottom, a run start
 * scrolls down, and scrolling up unpins until the user returns to the bottom.
 * The four options mirror the React hook and are independent: `autoScroll`
 * covers follow-on-content-growth, and the other three gate the
 * first-messages, run-start, and thread-switch scrolls. Provides the
 * scroll-to-bottom channel that {@link ThreadPrimitiveScrollToBottom} drives;
 * the React viewport's top-anchor system stays in the React viewport store
 * and is not ported.
 */
export const ThreadPrimitiveViewport = defineComponent({
  name: "ThreadPrimitiveViewport",
  props: {
    autoScroll: {
      type: Boolean,
      default: true,
    },
    scrollToBottomOnInitialize: {
      type: Boolean,
      default: true,
    },
    scrollToBottomOnRunStart: {
      type: Boolean,
      default: true,
    },
    scrollToBottomOnThreadSwitch: {
      type: Boolean,
      default: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(props, { slots }) {
    const divRef = shallowRef<HTMLElement | null>(null);
    const contentInset = shallowRef(0);
    const contentInsetEntries = new Map<symbol, number>();
    let intent: ScrollBehavior | null = null;
    const isAtBottom = shallowRef(true);
    let lastScrollTop = 0;
    let lastScrollHeight = 0;
    let lastObservedScrollHeight = 0;
    let lastObservedClientHeight = 0;
    let frame: number | null = null;

    const scrollToBottom = (behavior: ScrollBehavior) => {
      const div = divRef.value;
      if (!div) return;
      intent = behavior;
      div.scrollTo?.({ top: div.scrollHeight, behavior });
    };

    const scheduleScrollToBottom = (behavior: ScrollBehavior) => {
      intent = behavior;
      // The immediate watch below runs synchronously during SSR, where no
      // frame scheduler exists.
      if (typeof requestAnimationFrame === "undefined") return;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        scrollToBottom(behavior);
      });
    };

    const handleScroll = () => {
      const div = divRef.value;
      if (!div) return;

      const newIsAtBottom = isViewportAtBottom(div, contentInset.value);
      const inFlightDownward = !newIsAtBottom && lastScrollTop < div.scrollTop;
      if (!inFlightDownward) {
        if (newIsAtBottom) {
          // At-bottom is ambiguous while the viewport does not overflow; keep
          // the intent alive until content can actually scroll.
          if (viewportOverflows(div, contentInset.value)) intent = null;
        } else if (
          isUserScrollUp(
            { scrollTop: lastScrollTop, scrollHeight: lastScrollHeight },
            div,
          )
        ) {
          intent = null;
        }
        if (newIsAtBottom || intent === null) isAtBottom.value = newIsAtBottom;
      }

      lastScrollTop = div.scrollTop;
      lastScrollHeight = div.scrollHeight;
    };

    const updateContentInset = () => {
      let total = 0;
      for (const height of contentInsetEntries.values()) total += height;
      if (contentInset.value === total) return;
      const grew = total > contentInset.value;
      contentInset.value = total;
      // A growing inset obscures content a pinned viewport was showing, so it
      // follows like a content resize; a shrinking inset reveals content and
      // must not move the viewport.
      if (grew) {
        if (intent) {
          scrollToBottom(intent);
        } else if (props.autoScroll && isAtBottom.value) {
          scrollToBottom("instant");
        }
      }
      handleScroll();
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

    const onContentResize = () => {
      const div = divRef.value;
      if (!div) return;
      const { scrollHeight, clientHeight } = div;
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
      } else if (props.autoScroll && isAtBottom.value) {
        scrollToBottom("instant");
      }
      handleScroll();
    };

    // A pointer gesture invalidates pending bottom-scroll intent; otherwise an
    // intent kept alive by a non-overflowing thread hijacks the next content
    // growth. Unlike the React hook, an already scheduled frame is cancelled
    // too, so the gesture also wins the race against a just-planted intent.
    const onPointerdown = () => {
      intent = null;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    let disconnect: (() => void) | undefined;
    onMounted(() => {
      const div = divRef.value;
      if (!div) return;
      disconnect = observeContentResize(div, onContentResize);
    });
    onScopeDispose(() => {
      disconnect?.();
      if (frame !== null) cancelAnimationFrame(frame);
    });

    const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
    let initialized = false;
    watch(
      [hasMessages, () => props.scrollToBottomOnInitialize],
      ([has, enabled]) => {
        if (!has) {
          initialized = false;
          return;
        }
        if (!enabled || initialized) return;
        initialized = true;
        if (intent !== null) return;
        scheduleScrollToBottom("instant");
      },
      { immediate: true },
    );

    useAuiEvent("thread.runStart", () => {
      if (!props.scrollToBottomOnRunStart) return;
      scheduleScrollToBottom("auto");
    });

    useAuiEvent("threads.selectionChanged", () => {
      if (!props.scrollToBottomOnThreadSwitch) return;
      scheduleScrollToBottom("instant");
    });

    provide(viewportInjectionKey, {
      isAtBottom,
      scrollToBottom: (behavior: ScrollBehavior = "auto") =>
        scrollToBottom(behavior),
      registerContentInset,
    });

    return () =>
      h(
        "div",
        { ref: divRef, onScroll: handleScroll, onPointerdown },
        slots.default?.(),
      );
  },
});
