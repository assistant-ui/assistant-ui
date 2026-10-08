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
import { createThreadViewportAutoScroll } from "@assistant-ui/store/client";
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
    const contentInsetEntries = new Map<symbol, number>();
    const isAtBottom = shallowRef(true);
    const autoScroll = createThreadViewportAutoScroll({
      getOptions: () => ({
        autoScroll: props.autoScroll,
        scrollToBottomOnInitialize: props.scrollToBottomOnInitialize,
        scrollToBottomOnRunStart: props.scrollToBottomOnRunStart,
        scrollToBottomOnThreadSwitch: props.scrollToBottomOnThreadSwitch,
      }),
      onAtBottomChange: (value) => {
        isAtBottom.value = value;
      },
    });

    const updateContentInset = () => {
      let total = 0;
      for (const height of contentInsetEntries.values()) total += height;
      autoScroll.setContentInset(total);
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

    let detach: (() => void) | undefined;
    onMounted(() => {
      const div = divRef.value;
      if (!div) return;
      detach = autoScroll.attach(div);
    });
    onScopeDispose(() => {
      detach?.();
      autoScroll.dispose();
    });

    const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
    watch(
      [hasMessages, () => props.scrollToBottomOnInitialize],
      ([has]) => autoScroll.setHasMessages(has),
      { immediate: true },
    );

    useAuiEvent("thread.runStart", () => autoScroll.runStarted());

    useAuiEvent("threads.selectionChanged", () => autoScroll.threadSwitched());

    provide(viewportInjectionKey, {
      isAtBottom,
      scrollToBottom: (behavior: ScrollBehavior = "auto") =>
        autoScroll.scrollToBottom(behavior),
      registerContentInset,
    });

    return () => h("div", { ref: divRef }, slots.default?.());
  },
});
