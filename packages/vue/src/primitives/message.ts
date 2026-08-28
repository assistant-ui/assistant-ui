import {
  defineComponent,
  h,
  mergeProps,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/**
 * A wrapper element for one message. Sets `data-message-id` and tracks
 * pointer hover into `s.message.isHovering`, including an element already
 * under the pointer when it mounts.
 */
export const MessagePrimitiveRoot = defineComponent({
  name: "MessagePrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const messageId = useAuiState((s) => s.message.id);
    const onMouseenter = () => {
      aui.message.setIsHovering(true);
    };
    const onMouseleave = () => {
      aui.message.setIsHovering(false);
    };
    onScopeDispose(onMouseleave);
    const hoverRef = (el: unknown) => {
      if (el instanceof HTMLElement && el.matches(":hover")) {
        queueMicrotask(onMouseenter);
      }
    };
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          ref: hoverRef,
          "data-message-id": messageId.value,
          onMouseenter,
          onMouseleave,
        }),
        slots.default?.(),
      );
  },
});
