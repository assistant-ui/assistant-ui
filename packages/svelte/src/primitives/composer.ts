import { flushTapSync } from "@assistant-ui/tap";
import {
  composerCancelDisabled,
  composerInputDisabled,
  composerSendDisabled,
} from "@assistant-ui/core/store/internal";
import { getAuiContext, type ScopeTarget } from "../context";
import { useAuiState } from "../useAuiState";

const resolveTarget = (item: ScopeTarget | undefined): ScopeTarget =>
  item ?? getAuiContext();

/**
 * Builder for the composer textarea. Spread `props` onto a `<textarea>`.
 *
 * Enter submits (Shift+Enter inserts a newline, IME composition is ignored)
 * unless `submitOnEnter` is false; an Enter that cannot send falls through to
 * a newline. While the composer is not editing (an edit composer before
 * `beginEdit`), the value stays controlled to the empty composer text.
 * Without `item`, call during component initialization.
 */
export const composerInput = (options?: {
  submitOnEnter?: boolean | undefined;
  item?: ScopeTarget | undefined;
}) => {
  const item = resolveTarget(options?.item);
  const { aui } = item;
  const submitOnEnter = options?.submitOnEnter ?? true;

  const text = useAuiState(
    (s) => (s.composer.isEditing ? s.composer.text : ""),
    { item },
  );
  const inputDisabled = useAuiState(composerInputDisabled, { item });
  const sendDisabled = useAuiState(composerSendDisabled, { item });

  const oninput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    if (!aui.composer.getState().isEditing) {
      target.value = text.current;
      return;
    }
    flushTapSync(() => aui.composer.setText(target.value));
  };
  const onkeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || !submitOnEnter) return;
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    if (sendDisabled.current || inputDisabled.current) return;
    event.preventDefault();
    aui.composer.send();
  };

  return {
    props: {
      get value() {
        return text.current;
      },
      get disabled() {
        return inputDisabled.current;
      },
      oninput,
      onkeydown,
    },
  };
};

/**
 * Builder for the send button. Spread `props` onto a `<button>`. Disabled
 * while the composer cannot send or a queueless run is in flight. Without
 * `item`, call during component initialization.
 *
 * A caller's own `onclick` next to the spread replaces the builder's; compose
 * by forwarding the event (`onclick={(e) => { mine(e); send.props.onclick(e);
 * }}`), and a forwarded event that was `preventDefault`ed vetoes the send.
 */
export const composerSend = (options?: { item?: ScopeTarget | undefined }) => {
  const item = resolveTarget(options?.item);
  const { aui } = item;
  const disabled = useAuiState(composerSendDisabled, { item });

  return {
    props: {
      type: "button" as const,
      get disabled() {
        return disabled.current;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented || disabled.current) return;
        aui.composer.send();
      },
    },
  };
};

/**
 * Builder for the cancel button. Spread `props` onto a `<button>`. Disabled
 * while nothing is cancelable. Without `item`, call during component
 * initialization. Caller handlers compose the same way as `composerSend`.
 */
export const composerCancel = (options?: {
  item?: ScopeTarget | undefined;
}) => {
  const item = resolveTarget(options?.item);
  const { aui } = item;
  const disabled = useAuiState(composerCancelDisabled, { item });

  return {
    props: {
      type: "button" as const,
      get disabled() {
        return disabled.current;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented || disabled.current) return;
        aui.composer.cancel();
      },
    },
  };
};
