import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { isAttrDisabled } from "./attrDisabled";
import { useComposerSendState } from "./useComposerSendState";

/**
 * A button that sends the composer. Disabled while the composer cannot send,
 * or while a run is in flight and the runtime does not queue sends. A
 * fallthrough click listener runs first and can veto the send with
 * `preventDefault`.
 */
export const ComposerPrimitiveSend = defineComponent({
  name: "ComposerPrimitiveSend",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const { disabled, send } = useComposerSendState();
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      send();
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
