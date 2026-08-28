import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { messageErrorText } from "@assistant-ui/core/store/internal";
import { useAuiState } from "../useAuiState";

export const ErrorPrimitiveRoot = defineComponent({
  name: "ErrorPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    return () =>
      h("div", mergeProps({ role: "alert" }, attrs), slots.default?.());
  },
});

export const ErrorPrimitiveMessage = defineComponent({
  name: "ErrorPrimitiveMessage",
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { slots }) {
    const error = useAuiState(messageErrorText);
    return () =>
      error.value === undefined
        ? null
        : (slots.default?.() ?? String(error.value));
  },
});
