import { computed, defineComponent, h, mergeProps, type SlotsType } from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type {} from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/**
 * Scopes the subtree to the thread-list item at `index`: descendants read it
 * through `s.threadListItem`.
 */
export const ThreadListItemByIndexProvider = defineComponent({
  name: "ThreadListItemByIndexProvider",
  props: {
    index: {
      type: Number,
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const aui = useAui();
    const config = computed(() =>
      AuiConfig({
        threadListItem: Derived({
          source: "threads",
          query: {
            type: "index",
            index: props.index,
            archived: props.archived,
          },
          get: (aui) =>
            aui.threads.item({ index: props.index, archived: props.archived }),
        }),
      }),
    );
    return () =>
      h(
        AuiProvider,
        { config: config.value, extends: aui },
        { default: () => slots.default?.() },
      );
  },
});

/**
 * Renders the default slot once per thread in the list (or per archived
 * thread with `archived`), each instance scoped through
 * {@link ThreadListItemByIndexProvider}.
 */
export const ThreadListPrimitiveItems = defineComponent({
  name: "ThreadListPrimitiveItems",
  props: {
    archived: {
      type: Boolean,
      default: false,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const count = useAuiState((s) =>
      props.archived
        ? s.threads.archivedThreadIds.length
        : s.threads.threadIds.length,
    );
    return () =>
      Array.from({ length: count.value }, (_, index) =>
        h(
          ThreadListItemByIndexProvider,
          { index, archived: props.archived, key: index },
          { default: () => slots.default?.() },
        ),
      );
  },
});

/**
 * A button that switches to a new thread. Carries `data-active` and
 * `aria-current` while the new thread is the main one.
 */
export const ThreadListPrimitiveNew = defineComponent({
  name: "ThreadListPrimitiveNew",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const active = useAuiState(
      (s) => s.threads.newThreadId === s.threads.mainThreadId,
    );
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isAttrDisabled(attrs)) return;
      aui.threads.switchToNewThread();
    };
    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled: isAttrDisabled(attrs),
          ...(active.value && {
            "data-active": "true",
            "aria-current": "true",
          }),
          onClick,
        }),
        slots.default?.(),
      );
  },
});

/**
 * A button that switches to the current thread-list item's thread. Carries
 * `data-active` and `aria-current` while that thread is the main one.
 */
export const ThreadListItemPrimitiveTrigger = defineComponent({
  name: "ThreadListItemPrimitiveTrigger",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const active = useAuiState((s) => s.threadListItem.isMain);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isAttrDisabled(attrs)) return;
      aui.threadListItem.switchTo();
    };
    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled: isAttrDisabled(attrs),
          ...(active.value && {
            "data-active": "true",
            "aria-current": "true",
          }),
          onClick,
        }),
        slots.default?.(),
      );
  },
});

/**
 * Renders the current thread-list item's title. When the title is empty,
 * renders the default slot, or the `fallback` string.
 */
export const ThreadListItemPrimitiveTitle = defineComponent({
  name: "ThreadListItemPrimitiveTitle",
  props: {
    fallback: {
      type: String,
      default: "",
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const title = useAuiState((s) => s.threadListItem.title);
    return () =>
      title.value || (slots.default ? slots.default() : props.fallback);
  },
});
