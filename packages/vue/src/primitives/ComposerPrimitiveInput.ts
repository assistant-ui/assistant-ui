import { defineComponent, h, mergeProps, type SlotsType } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import type {} from "@assistant-ui/core/store";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useComposerSendState } from "./useComposerSendState";

/**
 * A textarea bound to the composer text, disabled while the thread is
 * disabled. Enter submits (Shift+Enter inserts a newline, IME composition is
 * ignored) unless `submitOnEnter` is false; an Enter that cannot send falls
 * through to a newline, and a fallthrough keydown listener can veto the
 * submit with `preventDefault`. While the composer is not editing (an edit
 * composer before `beginEdit`), the value stays controlled to the empty
 * composer text.
 */
export const ComposerPrimitiveInput = defineComponent({
  name: "ComposerPrimitiveInput",
  inheritAttrs: false,
  props: {
    submitOnEnter: {
      type: Boolean,
      default: true,
    },
  },
  slots: Object as SlotsType<Record<string, never>>,
  setup(props, { attrs }) {
    const aui = useAui();
    const text = useAuiState((s) =>
      s.composer.isEditing ? s.composer.text : "",
    );
    const threadDisabled = useAuiState(
      (s) =>
        s.thread.isDisabled || s.composer.dictation?.inputDisabled === true,
    );
    const { disabled, send } = useComposerSendState();

    const onInput = (event: Event) => {
      const target = event.target as HTMLTextAreaElement;
      if (!aui.composer.getState().isEditing) {
        target.value = text.value;
        return;
      }
      flushTapSync(() => aui.composer.setText(target.value));
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !props.submitOnEnter) return;
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      if (disabled.value || threadDisabled.value || isAttrDisabled(attrs))
        return;
      event.preventDefault();
      send();
    };

    return () =>
      h(
        "textarea",
        mergeProps(attrs, {
          value: text.value,
          disabled: threadDisabled.value || isAttrDisabled(attrs),
          onInput,
          onKeydown,
        }),
      );
  },
});
