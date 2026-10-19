import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import type {
  AssistantClient,
  AssistantState,
} from "@assistant-ui/store/client";
import { threadListLoadMoreDisabled } from "@assistant-ui/core/store/internal";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/**
 * A button that loads more threads. Stays mounted and disabled while no
 * more threads are available or a load is in flight.
 */
export const ThreadListPrimitiveLoadMore = defineComponent({
  name: "ThreadListPrimitiveLoadMore",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const disabled = useAuiState(threadListLoadMoreDisabled);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      void aui.threads.loadMore();
    };
    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled: disabled.value || isAttrDisabled(attrs),
          onClick,
        }),
        slots.default?.(),
      );
  },
});

const threadListItemAction = (
  name: string,
  action: (aui: AssistantClient) => void,
  isSupported: (state: AssistantState) => boolean = () => true,
) =>
  defineComponent({
    name,
    inheritAttrs: false,
    slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
    setup(_, { attrs, slots }) {
      const aui = useAui();
      const supported = useAuiState(isSupported);
      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || !supported.value || isAttrDisabled(attrs))
          return;
        action(aui);
      };
      return () =>
        h(
          "button",
          mergeProps(attrs, {
            type: "button",
            disabled: !supported.value || isAttrDisabled(attrs),
            onClick,
          }),
          slots.default?.(),
        );
    },
  });

/** A button that archives the current thread list item. */
export const ThreadListItemPrimitiveArchive = threadListItemAction(
  "ThreadListItemPrimitiveArchive",
  (aui) => aui.threadListItem.archive(),
);

/** A button that unarchives the current thread list item. */
export const ThreadListItemPrimitiveUnarchive = threadListItemAction(
  "ThreadListItemPrimitiveUnarchive",
  (aui) => aui.threadListItem.unarchive(),
  (s) => s.threads.canUnarchive,
);

/** A button that deletes the current thread list item. */
export const ThreadListItemPrimitiveDelete = threadListItemAction(
  "ThreadListItemPrimitiveDelete",
  (aui) => aui.threadListItem.delete(),
);
