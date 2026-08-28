import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import type { AssistantClient } from "@assistant-ui/store/client";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

export const ThreadListPrimitiveRoot = defineComponent({
  name: "ThreadListPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    return () => h("div", mergeProps(attrs, {}), slots.default?.());
  },
});

export const ThreadListPrimitiveLoadMore = defineComponent({
  name: "ThreadListPrimitiveLoadMore",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const disabled = useAuiState(
      (s) =>
        !s.threads.hasMore || s.threads.isLoading || s.threads.isLoadingMore,
    );
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      void aui.threads.loadMore();
    };
    return () =>
      disabled.value
        ? null
        : h(
            "button",
            mergeProps(attrs, {
              type: "button",
              disabled: isAttrDisabled(attrs),
              onClick,
            }),
            slots.default?.(),
          );
  },
});

const threadListItemAction = (
  name: string,
  action: (aui: AssistantClient) => void,
) =>
  defineComponent({
    name,
    inheritAttrs: false,
    slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
    setup(_, { attrs, slots }) {
      const aui = useAui();
      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || isAttrDisabled(attrs)) return;
        action(aui);
      };
      return () =>
        h(
          "button",
          mergeProps(attrs, {
            type: "button",
            disabled: isAttrDisabled(attrs),
            onClick,
          }),
          slots.default?.(),
        );
    },
  });

export const ThreadListItemPrimitiveArchive = threadListItemAction(
  "ThreadListItemPrimitiveArchive",
  (aui) => aui.threadListItem.archive(),
);

export const ThreadListItemPrimitiveUnarchive = threadListItemAction(
  "ThreadListItemPrimitiveUnarchive",
  (aui) => aui.threadListItem.unarchive(),
);

export const ThreadListItemPrimitiveDelete = threadListItemAction(
  "ThreadListItemPrimitiveDelete",
  (aui) => aui.threadListItem.delete(),
);

export const ThreadListItemPrimitiveRoot = defineComponent({
  name: "ThreadListItemPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const active = useAuiState(
      (s) => s.threads.mainThreadId === s.threadListItem.id,
    );
    return () =>
      h(
        "div",
        mergeProps(
          active.value ? { "data-active": "true", "aria-current": "true" } : {},
          attrs,
        ),
        slots.default?.(),
      );
  },
});
