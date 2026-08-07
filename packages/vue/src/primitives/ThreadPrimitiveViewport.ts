import {
  defineComponent,
  h,
  onMounted,
  onScopeDispose,
  shallowRef,
  watch,
  type SlotsType,
} from "vue";
import type {} from "@assistant-ui/core/store";
import { useAuiEvent } from "../useAuiEvent";
import { useAuiState } from "../useAuiState";
import {
  isUserScrollUp,
  isViewportAtBottom,
  observeContentResize,
  viewportOverflows,
} from "./viewportScroll";

/**
 * A scrollable container that keeps the thread pinned to the bottom: content
 * growth scrolls back down while the user sits at the bottom, a run start
 * scrolls down, and scrolling up unpins until the user returns to the bottom.
 * Setting `autoScroll` to false disables only the follow-on-content-growth
 * behavior; the first-messages and run-start scrolls remain, matching the
 * React hook's independent option defaults.
 */
export const ThreadPrimitiveViewport = defineComponent({
  name: "ThreadPrimitiveViewport",
  props: {
    autoScroll: {
      type: Boolean,
      default: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const divRef = shallowRef<HTMLElement | null>(null);
    let intent: ScrollBehavior | null = null;
    let isAtBottom = true;
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

      const newIsAtBottom = isViewportAtBottom(div);
      const inFlightDownward = !newIsAtBottom && lastScrollTop < div.scrollTop;
      if (!inFlightDownward) {
        if (newIsAtBottom) {
          // At-bottom is ambiguous while the viewport does not overflow; keep
          // the intent alive until content can actually scroll.
          if (viewportOverflows(div)) intent = null;
        } else if (
          isUserScrollUp(
            { scrollTop: lastScrollTop, scrollHeight: lastScrollHeight },
            div,
          )
        ) {
          intent = null;
        }
        if (newIsAtBottom || intent === null) isAtBottom = newIsAtBottom;
      }

      lastScrollTop = div.scrollTop;
      lastScrollHeight = div.scrollHeight;
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
      } else if (props.autoScroll && isAtBottom) {
        scrollToBottom("instant");
      }
      handleScroll();
    };

    // A pointer gesture invalidates pending bottom-scroll intent; otherwise an
    // intent kept alive by a non-overflowing thread hijacks the next content
    // growth.
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
      hasMessages,
      (has) => {
        if (!has) {
          initialized = false;
          return;
        }
        if (initialized) return;
        initialized = true;
        if (intent !== null) return;
        scheduleScrollToBottom("instant");
      },
      { immediate: true },
    );

    useAuiEvent("thread.runStart", () => {
      scheduleScrollToBottom("auto");
    });

    useAuiEvent("threadListItem.switchedTo", () => {
      scheduleScrollToBottom("instant");
    });

    return () =>
      h(
        "div",
        { ref: divRef, onScroll: handleScroll, onPointerdown },
        slots.default?.(),
      );
  },
});
