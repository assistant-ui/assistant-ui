import {
  defineComponent,
  h,
  mergeProps,
  onScopeDispose,
  type SlotsType,
} from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import type {} from "@assistant-ui/core/store";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/** A button that begins editing the current message. Disabled while editing. */
export const ActionBarPrimitiveEdit = defineComponent({
  name: "ActionBarPrimitiveEdit",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const disabled = useAuiState((s) => s.composer.isEditing);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      aui.composer.beginEdit();
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

/**
 * A button that regenerates the current assistant message. Disabled while a
 * run is in flight, the thread is disabled, or the message is not an
 * assistant message.
 */
export const ActionBarPrimitiveReload = defineComponent({
  name: "ActionBarPrimitiveReload",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const disabled = useAuiState(
      (s) =>
        s.thread.isRunning ||
        s.thread.isDisabled ||
        s.message.role !== "assistant",
    );
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      aui.message.reload();
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

const defaultCopyToClipboard = (text: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return Promise.reject(new Error("Clipboard API is not available."));
  }
  return navigator.clipboard.writeText(text);
};

/**
 * A button that copies the current message (or, while editing, the edit
 * composer text). `data-copied` is present for `copiedDuration` milliseconds
 * after a successful copy. Disabled while an assistant message is still
 * running or the message has no text.
 */
export const ActionBarPrimitiveCopy = defineComponent({
  name: "ActionBarPrimitiveCopy",
  inheritAttrs: false,
  props: {
    copiedDuration: {
      type: Number,
      default: 3000,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { attrs, slots }) {
    const aui = useAui();
    const disabled = useAuiState(
      (s) =>
        !(
          (s.message.role !== "assistant" ||
            s.message.status?.type !== "running") &&
          s.message.parts.some(
            (part) => part.type === "text" && part.text.length > 0,
          )
        ),
    );
    const isCopied = useAuiState((s) => s.message.isCopied);
    const isEditing = useAuiState((s) => s.composer.isEditing);
    const composerText = useAuiState((s) => s.composer.text);

    let copiedTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    onScopeDispose(() => {
      disposed = true;
      if (copiedTimer === undefined) return;
      clearTimeout(copiedTimer);
      copiedTimer = undefined;
      aui.message.setIsCopied(false);
    });

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      const value = isEditing.value
        ? composerText.value
        : aui.message.getCopyText();
      if (!value) return;
      // A by-index scope follows whatever message occupies the slot, so late
      // completions and timers re-check the copied message's id before
      // touching state.
      const copiedMessageId = aui.message.getState().id;
      const stillCopiedMessage = () =>
        !disposed && aui.message.getState().id === copiedMessageId;
      // The rejection handler swallows clipboard write failures (permission
      // denied, API unavailable) so they don't surface as unhandled promise
      // rejections.
      Promise.resolve(defaultCopyToClipboard(value)).then(
        () => {
          if (!stillCopiedMessage()) return;
          if (copiedTimer !== undefined) clearTimeout(copiedTimer);
          flushTapSync(() => aui.message.setIsCopied(true));
          copiedTimer = setTimeout(() => {
            copiedTimer = undefined;
            if (stillCopiedMessage()) {
              flushTapSync(() => aui.message.setIsCopied(false));
            }
          }, props.copiedDuration);
        },
        () => {},
      );
    };

    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled: disabled.value || isAttrDisabled(attrs),
          ...(isCopied.value && { "data-copied": "" }),
          onClick,
        }),
        slots.default?.(),
      );
  },
});
