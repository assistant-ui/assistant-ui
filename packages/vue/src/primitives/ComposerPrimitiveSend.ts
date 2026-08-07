import { defineComponent, h, type SlotsType } from "vue";
import { useComposerSendState } from "./useComposerSendState";

/**
 * A button that sends the composer. Disabled while the composer cannot send,
 * or while a run is in flight and the runtime does not queue sends.
 */
export const ComposerPrimitiveSend = defineComponent({
  name: "ComposerPrimitiveSend",
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { slots }) {
    const { disabled, send } = useComposerSendState();
    return () =>
      h(
        "button",
        { type: "button", disabled: disabled.value, onClick: () => send() },
        slots.default?.(),
      );
  },
});
