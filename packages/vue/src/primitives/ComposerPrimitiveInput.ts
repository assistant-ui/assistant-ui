import { defineComponent, h } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import type {} from "@assistant-ui/core/store";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useComposerSendState } from "./useComposerSendState";

/**
 * A textarea bound to the composer text. Enter submits (Shift+Enter inserts a
 * newline, IME composition is ignored) unless `submitOnEnter` is false; an
 * Enter that cannot send falls through to a newline. Inert while the composer
 * is not editing (an edit composer before `beginEdit`). Non-prop attributes
 * fall through to the textarea element.
 */
export const ComposerPrimitiveInput = defineComponent({
  name: "ComposerPrimitiveInput",
  props: {
    submitOnEnter: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const aui = useAui();
    const text = useAuiState((s) =>
      s.composer.isEditing ? s.composer.text : "",
    );
    const { disabled, send } = useComposerSendState();

    const onInput = (event: Event) => {
      if (!aui.composer.getState().isEditing) return;
      flushTapSync(() =>
        aui.composer.setText((event.target as HTMLTextAreaElement).value),
      );
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (!props.submitOnEnter) return;
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      if (disabled.value) return;
      event.preventDefault();
      send();
    };

    return () => h("textarea", { value: text.value, onInput, onKeydown });
  },
});
