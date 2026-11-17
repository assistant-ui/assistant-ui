import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { isCompositionKey } from "@assistant-ui/core/internal";
import {
  composerInputDisabled,
  composerSendDisabled,
} from "@assistant-ui/core/store/internal";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/**
 * A textarea bound to the composer text, disabled while the thread is disabled. Enter submits unless Shift is held, IME composition is active, or `submitOnEnter` is false; an Enter that cannot send falls through to a newline. Caller input and keydown handlers run first and can veto with `preventDefault`. While the composer is not editing, the value stays controlled to empty text.
 */
export const ComposerPrimitiveInput = (
  props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    submitOnEnter?: boolean;
  },
): JSX.Element => {
  const [local, rest] = splitProps(props, [
    "submitOnEnter",
    "onInput",
    "onKeyDown",
  ]);
  const aui = useAui();
  const text = useAuiState((s) =>
    s.composer.isEditing ? s.composer.text : "",
  );
  const inputDisabled = useAuiState(composerInputDisabled);
  const sendDisabled = useAuiState(composerSendDisabled);

  return createComponent(
    Dynamic,
    mergeProps({ name: "input" }, rest, {
      component: "textarea",
      get value() {
        return text();
      },
      get disabled() {
        return inputDisabled() || rest.disabled;
      },
      onInput: (
        event: InputEvent & {
          currentTarget: HTMLTextAreaElement;
          target: HTMLTextAreaElement;
        },
      ) => {
        callEventHandler<HTMLTextAreaElement, typeof event>(
          local.onInput,
          event,
        );
        if (event.defaultPrevented) return;
        const target = event.currentTarget;
        if (!aui.composer.getState().isEditing) {
          target.value = text();
          return;
        }
        flushTapSync(() =>
          aui.composer.setText(target.value, { origin: "user" }),
        );
      },
      onKeyDown: (
        event: KeyboardEvent & {
          currentTarget: HTMLTextAreaElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onKeyDown, event);
        if (event.defaultPrevented || local.submitOnEnter === false) return;
        if (event.key !== "Enter" || event.shiftKey || isCompositionKey(event))
          return;
        if (sendDisabled() || inputDisabled() || rest.disabled) return;
        event.preventDefault();
        aui.composer.send();
      },
    }),
  );
};
