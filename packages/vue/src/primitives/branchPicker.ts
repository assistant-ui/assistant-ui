import {
  defineComponent,
  h,
  mergeProps,
  type ComputedRef,
  type SlotsType,
} from "vue";
import {
  branchPickerNextDisabled,
  branchPickerPreviousDisabled,
} from "@assistant-ui/core/store/internal";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

const branchButton = (
  name: string,
  useDisabled: () => ComputedRef<boolean>,
  position: "previous" | "next",
) =>
  defineComponent({
    name,
    inheritAttrs: false,
    slots: Object as SlotsType<{ default?: () => unknown }>,
    setup(_, { attrs, slots }) {
      const aui = useAui();
      const disabled = useDisabled();
      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
          return;
        aui.message.switchToBranch({ position });
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

/** A button that switches the current message to its previous branch. */
export const BranchPickerPrimitivePrevious = branchButton(
  "BranchPickerPrimitivePrevious",
  () => useAuiState(branchPickerPreviousDisabled),
  "previous",
);

/** A button that switches the current message to its next branch. */
export const BranchPickerPrimitiveNext = branchButton(
  "BranchPickerPrimitiveNext",
  () => useAuiState(branchPickerNextDisabled),
  "next",
);

/** Renders the current message's 1-based branch number as text. */
export const BranchPickerPrimitiveNumber = defineComponent({
  name: "BranchPickerPrimitiveNumber",
  setup() {
    const branchNumber = useAuiState((s) => s.message.branchNumber);
    return () => String(branchNumber.value);
  },
});

/** Renders the current message's branch count as text. */
export const BranchPickerPrimitiveCount = defineComponent({
  name: "BranchPickerPrimitiveCount",
  setup() {
    const branchCount = useAuiState((s) => s.message.branchCount);
    return () => String(branchCount.value);
  },
});
