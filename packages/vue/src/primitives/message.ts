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
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          "data-message-id": messageId.value,
          onMouseenter,
          onMouseleave,
        }),
        slots.default?.(),
      );
  },
});
