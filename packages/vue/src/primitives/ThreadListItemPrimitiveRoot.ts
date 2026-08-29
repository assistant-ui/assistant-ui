import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { useAuiState } from "../useAuiState";
import {
  provideThreadListItemFocus,
  useThreadListCollection,
} from "./threadListFocusGroup";

export const ThreadListItemPrimitiveRoot = defineComponent({
  name: "ThreadListItemPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const active = useAuiState(
      (s) => s.threads.mainThreadId === s.threadListItem.id,
    );
    const focus = provideThreadListItemFocus();
    const collection = useThreadListCollection();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const trigger = focus.trigger.value;
      if (
        !trigger ||
        event.target !== trigger ||
        (event.key !== "ArrowDown" && event.key !== "ArrowUp")
      ) {
        return;
      }
      const triggers = collection?.getTriggers();
      if (!triggers) return;
      const next =
        triggers[
          triggers.indexOf(trigger) + (event.key === "ArrowDown" ? 1 : -1)
        ];
      if (!next) return;
      next.focus();
      event.preventDefault();
    };
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          ...(active.value && {
            "data-active": "true",
            "aria-current": "true",
          }),
          onKeydown,
        }),
        slots.default?.(),
      );
  },
});
