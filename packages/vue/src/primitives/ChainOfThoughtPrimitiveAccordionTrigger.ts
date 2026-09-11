import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { isAttrDisabled } from "./attrDisabled";

/**
 * A button that toggles the collapsed state of the chain of thought accordion.
 * Caller listeners run first and can veto the toggle via `preventDefault`.
 */
export const ChainOfThoughtPrimitiveAccordionTrigger = defineComponent({
  name: "ChainOfThoughtPrimitiveAccordionTrigger",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isAttrDisabled(attrs)) return;
      aui.chainOfThought.setCollapsed(!collapsed.value);
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
