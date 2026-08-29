import {
  defineComponent,
  h,
  mergeProps,
  onScopeDispose,
  type ComponentPublicInstance,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import {
  useThreadListCollection,
  useThreadListItemFocus,
} from "./threadListFocusGroup";

/**
 * A button that switches to the current thread-list item's thread. Carries
 * `data-active` and `aria-current` while that thread is the main one, for
 * standalone use; when nested under `ThreadListItemPrimitiveRoot` the root
 * stamps them too, diverging from React's root-only pattern to keep existing
 * standalone consumers styled.
 */
export const ThreadListItemPrimitiveTrigger = defineComponent({
  name: "ThreadListItemPrimitiveTrigger",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const active = useAuiState(
      (s) => s.threads.mainThreadId === s.threadListItem.id,
    );
    const collection = useThreadListCollection();
    const focus = useThreadListItemFocus();
    const key = Symbol();
    let trigger: HTMLButtonElement | null = null;
    let unregister: (() => void) | undefined;
    const setTrigger = (element: Element | ComponentPublicInstance | null) => {
      const next = element instanceof HTMLButtonElement ? element : null;
      const previous = trigger;
      if (previous === next) return;
      unregister?.();
      if (focus && (next || focus.trigger.value === previous)) {
        focus.trigger.value = next;
      }
      trigger = next;
      unregister = next ? collection?.registerTrigger(key, next) : undefined;
    };
    onScopeDispose(() => {
      unregister?.();
      if (focus?.trigger.value === trigger) focus.trigger.value = null;
    });
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isAttrDisabled(attrs)) return;
      aui.threadListItem.switchTo();
    };
    return () =>
      h(
        "button",
        mergeProps(attrs, {
          ref: setTrigger,
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
