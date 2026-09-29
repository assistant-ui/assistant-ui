import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { composerCancelDisabled } from "@assistant-ui/core/store/internal";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/**
 * A button that cancels the current run. Disabled while nothing can be
 * cancelled. A fallthrough click listener runs first and can veto the cancel
 * with `preventDefault`.
 */
export const ComposerPrimitiveCancel = defineComponent({
  name: "ComposerPrimitiveCancel",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const disabled = useAuiState(composerCancelDisabled);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      aui.composer.cancel();
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
