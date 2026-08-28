import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { messageErrorText } from "@assistant-ui/core/store/internal";
import { useAuiState } from "../useAuiState";

/** A wrapper element for the current message's error state. */
export const ErrorPrimitiveRoot = defineComponent({
  name: "ErrorPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    return () =>
      h("div", mergeProps({ role: "alert" }, attrs), slots.default?.());
  },
});

/**
 * Renders the current assistant message's error text (raw text, slot
 * override supported); renders nothing while the message has no error.
 */
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
