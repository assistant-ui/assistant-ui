"use client";

import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { flushTapSync } from "@assistant-ui/tap";
import { useComposerSend } from "@assistant-ui/core/react";
import type { ComposerSendOptions } from "@assistant-ui/core/store";
import { useTriggerPopoverActiveAriaOptional } from "../primitives/composer/trigger/TriggerPopoverRootContext";

export type Unstable_UseComposerInputOptions = {
  /**
   * Disables the input in addition to the composer's own disabled sources
   * (thread disabled, active dictation). When disabled, `isDisabled` is `true`
   * and `canSend` is `false`.
   */
  disabled?: boolean | undefined;
};

export type Unstable_ComposerInput = {
  /** Current composer text, or `""` when the composer is not editing. */
  value: string;
  /**
   * Writes `text` into the composer, mirroring `ComposerPrimitive.Input`:
   * a no-op unless the composer is editing, committed via `flushTapSync` so the
   * controlled value stays in sync within the same tick.
   */
  setText(text: string): void;
  /**
   * Sends the current message when `canSend` is `true`; otherwise a no-op.
   * Accepts the same options as the composer send action.
   */
  send(options?: ComposerSendOptions): void;
  /**
   * Whether the input is disabled, combining the `disabled` option with the
   * composer's own disabled sources (thread disabled, active dictation).
   */
  isDisabled: boolean;
  /**
   * Whether a send is currently available. Matches `ComposerPrimitive.Send`
   * gating (non-empty editing composer, not running without queue support) and
   * is additionally `false` while `isDisabled`.
   */
  canSend: boolean;
};

/**
 * @deprecated Under active development and might change without notice.
 *
 * Headless bridge to the composer's text value and send action, for building a
 * custom composer input without `ComposerPrimitive.Input`. It is a thin bridge,
 * not a second input: it does not own keyboard behavior, autosize, IME or
 * contentEditable sync, paste/drop attachments, focus management, or rich-text
 * state. Spread `unstable_useTriggerPopoverAriaProps()` onto your element for
 * trigger-popover combobox semantics.
 *
 * @example
 * ```tsx
 * const { value, setText, send, isDisabled, canSend } = unstable_useComposerInput();
 * <textarea
 *   value={value}
 *   disabled={isDisabled}
 *   onChange={(e) => setText(e.target.value)}
 *   onKeyDown={(e) => {
 *     if (e.key === "Enter" && !e.shiftKey && canSend) {
 *       e.preventDefault();
 *       send();
 *     }
 *   }}
 * />
 * ```
 */
export function unstable_useComposerInput(
  options?: Unstable_UseComposerInputOptions,
): Unstable_ComposerInput {
  const aui = useAui();
  const optionDisabled = options?.disabled ?? false;

  const value = useAuiState((s) =>
    s.composer.isEditing ? s.composer.text : "",
  );

  const composerDisabled = useAuiState(
    (s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled,
  );
  const isDisabled = Boolean(composerDisabled) || optionDisabled;

  const setText = useCallback(
    (text: string) => {
      if (!aui.composer().getState().isEditing) return;
      flushTapSync(() => {
        aui.composer().setText(text);
      });
    },
    [aui],
  );

  const { send: rawSend, disabled: sendDisabled } = useComposerSend();
  const canSend = !sendDisabled && !isDisabled;
  const send = useCallback(
    (options?: ComposerSendOptions) => {
      if (!canSend) return;
      rawSend(options);
    },
    [canSend, rawSend],
  );

  return { value, setText, send, isDisabled, canSend };
}

export type Unstable_TriggerPopoverAriaProps = {
  "aria-controls"?: string;
  "aria-expanded"?: true;
  "aria-haspopup"?: "listbox";
  "aria-activedescendant"?: string | undefined;
};

/**
 * @deprecated Under active development and might change without notice.
 *
 * ARIA combobox attributes for the focused element (typically the composer
 * input) describing the open trigger popover, per the WAI-ARIA editable
 * combobox pattern. Returns an empty object outside a `TriggerPopoverRoot` or
 * when no popover is open. Spread these last so they take precedence over any
 * matching ARIA props you set yourself, mirroring `ComposerPrimitive.Input`.
 *
 * @example
 * ```tsx
 * const aria = unstable_useTriggerPopoverAriaProps();
 * <textarea {...aria} />
 * ```
 */
export function unstable_useTriggerPopoverAriaProps(): Unstable_TriggerPopoverAriaProps {
  const activeAria = useTriggerPopoverActiveAriaOptional();
  if (!activeAria) return {};
  // Mirror ComposerPrimitive.Input: emit `aria-activedescendant` even when
  // there is no highlighted item so spreading these last clears a stale value.
  return {
    "aria-controls": activeAria.popoverId,
    "aria-expanded": true,
    "aria-haspopup": "listbox",
    "aria-activedescendant": activeAria.highlightedItemId,
  };
}
