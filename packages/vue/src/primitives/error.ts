import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
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
    const error = useAuiState((s) => {
      if (
        s.message.status?.type !== "incomplete" ||
        s.message.status.reason !== "error"
      ) {
        return undefined;
      }
      const value = s.message.status.error;
      if (typeof value === "string") return value;
      if (
        typeof value === "object" &&
        value !== null &&
        "message" in value &&
        typeof value.message === "string"
      ) {
        return value.message;
      }
      return value ?? "An error occurred";
    });
    return () =>
      error.value === undefined
        ? null
        : (slots.default?.() ?? String(error.value));
  },
});
