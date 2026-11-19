import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { composerSendDisabled } from "@assistant-ui/core/store/internal";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/**
 * A button that sends the composer. Disabled while the composer cannot send, or while a run is in flight and the runtime does not queue sends. The caller's click handler runs first and can veto the send with `preventDefault`.
 */
export const ComposerPrimitiveSend = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick"]);
  const aui = useAui();
  const disabled = useAuiState(composerSendDisabled);

  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      get disabled() {
        return disabled() || rest.disabled;
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || disabled() || rest.disabled) return;
        aui.composer.send();
      },
    }),
  );
};
