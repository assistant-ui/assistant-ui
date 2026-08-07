import {
  defineComponent,
  h,
  inject,
  mergeProps,
  type PropType,
  type SlotsType,
} from "vue";
import { isAttrDisabled } from "./attrDisabled";
import { viewportInjectionKey } from "./viewportContext";

/**
 * A button that scrolls the surrounding {@link ThreadPrimitiveViewport} to
 * the bottom. Disabled while the viewport is already at the bottom, or when
 * no viewport provides the channel.
 */
export const ThreadPrimitiveScrollToBottom = defineComponent({
  name: "ThreadPrimitiveScrollToBottom",
  inheritAttrs: false,
  props: {
    behavior: {
      type: String as PropType<ScrollBehavior>,
      default: "auto",
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { attrs, slots }) {
    const viewport = inject(viewportInjectionKey, null);
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        !viewport ||
        viewport.isAtBottom.value ||
        isAttrDisabled(attrs)
      )
        return;
      viewport.scrollToBottom(props.behavior);
    };
    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled:
            !viewport || viewport.isAtBottom.value || isAttrDisabled(attrs),
          onClick,
        }),
        slots.default?.(),
      );
  },
});
