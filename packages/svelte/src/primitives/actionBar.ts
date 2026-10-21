import { onDestroy } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import {
  actionBarCopyDisabled,
  actionBarEditDisabled,
  actionBarReloadDisabled,
} from "@assistant-ui/core/store/internal";
import { getAuiContext, type ScopeTarget } from "../context";
import { useAuiState } from "../useAuiState";

const resolveTarget = (item: ScopeTarget | undefined): ScopeTarget =>
  item ?? getAuiContext();

const defaultCopyToClipboard = (text: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return Promise.reject(new Error("Clipboard API is not available."));
  }
  return navigator.clipboard.writeText(text);
};

/**
 * Builder for the edit button. Spread `props` onto a `<button>`. Begins
 * editing the scoped message; disabled while already editing. Caller handlers
 * compose the same way as `composerSend`.
 */
export const actionBarEdit = (options?: { item?: ScopeTarget | undefined }) => {
  const item = resolveTarget(options?.item);
  const { aui } = item;
  const disabled = useAuiState(actionBarEditDisabled, { item });

  return {
    props: {
      type: "button" as const,
      get disabled() {
        return disabled.current;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented || disabled.current) return;
        aui.composer.beginEdit();
      },
    },
  };
};

/**
 * Builder for the reload button. Spread `props` onto a `<button>`.
 * Regenerates the scoped assistant message; disabled while a run is in
 * flight, the thread is disabled, or the message is not an assistant
 * message.
 */
export const actionBarReload = (options?: {
  item?: ScopeTarget | undefined;
}) => {
  const item = resolveTarget(options?.item);
  const { aui } = item;
  const disabled = useAuiState(actionBarReloadDisabled, { item });

  return {
    props: {
      type: "button" as const,
      get disabled() {
        return disabled.current;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented || disabled.current) return;
        aui.message.reload();
      },
    },
  };
};

/**
 * Builder for the copy button. Spread `props` onto a `<button>`. Copies the
 * scoped message's text (or, while editing, the edit composer text) and
 * reflects the copied window through `isCopied` for `copiedDuration`
 * milliseconds. Disabled while an assistant message is still running or the
 * message has no text.
 *
 * Constructed during component initialization the builder clears its timer
 * and copied state with the component; constructed elsewhere (with `item`)
 * there is no lifecycle to bind, and late completions are contained by the
 * copied message's id guard alone.
 */
export const actionBarCopy = (options?: {
  item?: ScopeTarget | undefined;
  copiedDuration?: number | undefined;
  copyToClipboard?: ((text: string) => void | Promise<void>) | undefined;
}) => {
  const item = resolveTarget(options?.item);
  const { aui } = item;
  const copiedDuration = options?.copiedDuration ?? 3000;
  const copyToClipboard = options?.copyToClipboard ?? defaultCopyToClipboard;

  const disabled = useAuiState(actionBarCopyDisabled, { item });
  const isCopied = useAuiState((s) => s.message.isCopied, { item });
  const isEditing = useAuiState((s) => s.composer.isEditing, { item });
  const composerText = useAuiState((s) => s.composer.text, { item });

  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  let copiedFeedbackTarget: ((value: boolean) => void) | undefined;
  let destroyed = false;
  // Best effort: created during component initialization the builder cleans
  // up with the component, matching the react and vue implementations; with
  // an explicit item outside init there is no lifecycle to bind.
  try {
    onDestroy(() => {
      destroyed = true;
      if (copiedTimer !== undefined) clearTimeout(copiedTimer);
      copiedTimer = undefined;
      flushTapSync(() => copiedFeedbackTarget?.(false));
      copiedFeedbackTarget = undefined;
    });
  } catch {
    /* outside component init */
  }

  const onclick = (event?: MouseEvent) => {
    if (event?.defaultPrevented || disabled.current) return;
    const value = isEditing.current
      ? composerText.current
      : aui.message.getCopyText();
    if (!value) return;
    const anchorId = aui.message.getState().id;
    const setIsCopied = aui.message.setIsCopied;
    const stillCopiedMessage = () =>
      !destroyed && aui.message.getState().id === anchorId;
    // The writer runs synchronously inside the click so the user-gesture
    // gating of navigator.clipboard survives (WebKit scopes it to the stack);
    // the try contains a synchronously throwing caller-supplied writer, and
    // the rejection handler swallows clipboard failures (permission denied,
    // API unavailable) so they don't surface as unhandled rejections.
    let write: void | Promise<void>;
    try {
      write = copyToClipboard(value);
    } catch {
      return;
    }
    Promise.resolve(write).then(
      () => {
        if (!stillCopiedMessage()) return;
        if (copiedTimer !== undefined) clearTimeout(copiedTimer);
        flushTapSync(() => {
          copiedFeedbackTarget?.(false);
          copiedFeedbackTarget = setIsCopied;
          setIsCopied(true);
        });
        if (destroyed) return;
        copiedTimer = setTimeout(() => {
          copiedTimer = undefined;
          flushTapSync(() => setIsCopied(false));
          copiedFeedbackTarget = undefined;
        }, copiedDuration);
      },
      () => {},
    );
  };

  return {
    get isCopied() {
      return isCopied.current;
    },
    props: {
      type: "button" as const,
      get disabled() {
        return disabled.current;
      },
      get "data-copied"() {
        return isCopied.current ? "" : undefined;
      },
      onclick,
    },
  };
};
