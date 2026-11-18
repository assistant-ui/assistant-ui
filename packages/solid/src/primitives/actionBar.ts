import {
  createComponent,
  mergeProps,
  onCleanup,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import {
  actionBarCopyDisabled,
  actionBarEditDisabled,
  actionBarReloadDisabled,
} from "@assistant-ui/core/store/internal";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/** A button that begins editing the current message. Disabled while editing. */
export const ActionBarPrimitiveEdit = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick"]);
  const aui = useAui();
  const disabled = useAuiState(actionBarEditDisabled);

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
        aui.composer.beginEdit();
      },
    }),
  );
};

/**
 * A button that regenerates the current assistant message. Disabled while a
 * run is in flight, the thread is disabled, or the message is not an
 * assistant message.
 */
export const ActionBarPrimitiveReload = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick"]);
  const aui = useAui();
  const disabled = useAuiState(actionBarReloadDisabled);

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
        aui.message.reload();
      },
    }),
  );
};

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
export const ActionBarPrimitiveCopy = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    copiedDuration?: number;
  },
): JSX.Element => {
  const [local, rest] = splitProps(props, ["copiedDuration", "onClick"]);
  const aui = useAui();
  const disabled = useAuiState(actionBarCopyDisabled);
  const isCopied = useAuiState((s) => s.message.isCopied);
  const isEditing = useAuiState((s) => s.composer.isEditing);
  const composerText = useAuiState((s) => s.composer.text);

  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  let copiedFeedbackTarget: ((value: boolean) => void) | undefined;
  let disposed = false;
  onCleanup(() => {
    disposed = true;
    if (copiedTimer !== undefined) clearTimeout(copiedTimer);
    copiedTimer = undefined;
    flushTapSync(() => copiedFeedbackTarget?.(false));
    copiedFeedbackTarget = undefined;
  });

  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      get disabled() {
        return disabled() || rest.disabled;
      },
      get "data-copied"() {
        return isCopied() ? "" : undefined;
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || disabled() || rest.disabled) return;
        const value = isEditing() ? composerText() : aui.message.getCopyText();
        if (!value) return;
        const copiedMessageId = aui.message.getState().id;
        const setIsCopied = aui.message.setIsCopied;
        const stillCopiedMessage = () =>
          !disposed && aui.message.getState().id === copiedMessageId;
        Promise.resolve(defaultCopyToClipboard(value)).then(
          () => {
            if (!stillCopiedMessage()) return;
            if (copiedTimer !== undefined) clearTimeout(copiedTimer);
            flushTapSync(() => {
              copiedFeedbackTarget?.(false);
              copiedFeedbackTarget = setIsCopied;
              setIsCopied(true);
            });
            if (disposed) return;
            copiedTimer = setTimeout(() => {
              copiedTimer = undefined;
              flushTapSync(() => setIsCopied(false));
              copiedFeedbackTarget = undefined;
            }, local.copiedDuration ?? 3000);
          },
          () => {},
        );
      },
    }),
  );
};
