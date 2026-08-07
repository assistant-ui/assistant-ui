import { defineComponent, h, type SlotsType } from "vue";
import type {} from "@assistant-ui/core/store";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/** A button that cancels the current run. Disabled while nothing can be cancelled. */
export const ComposerPrimitiveCancel = defineComponent({
  name: "ComposerPrimitiveCancel",
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { slots }) {
    const aui = useAui();
    const disabled = useAuiState((s) => !s.composer.canCancel);
    return () =>
      h(
        "button",
        {
          type: "button",
          disabled: disabled.value,
          onClick: () => aui.composer.cancel(),
        },
        slots.default?.(),
      );
  },
});
