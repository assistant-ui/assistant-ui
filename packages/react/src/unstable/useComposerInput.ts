"use client";

import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { flushTapSync } from "@assistant-ui/tap";
import { useComposerSend } from "@assistant-ui/core/react";
import type { ComposerSendOptions } from "@assistant-ui/core/store";
import {
  type TriggerPopoverAriaProps,
  useComposerInputDisabled,
  useComposerInputValue,
  useTriggerPopoverAriaProps,
} from "../primitives/composer/useComposerInputState";

/**
 * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
 */
export type Unstable_UseComposerInputOptions = {
  /**
   * Disables the input in addition to the composer's own disabled sources
   * (thread disabled, active dictation). When disabled, `isDisabled` is `true`
   * and `canSend` is `false`.
   */
  disabled?: boolean | undefined;
};

/**
 * @deprecated Experimental since 2026-06-11. Not scheduled for removal; the API may change in any release.
 */
export type Unstable_ComposerInput = {
  /** Current composer text, or `""` when the composer is not editing. */
  value: string;
  /**
   * Writes `text` into the composer, mirroring `ComposerPrimitive.Input`:
   * a no-op unless the composer is editing; the controlled value stays in
   * sync within the same tick.
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
 * @deprecated Experimental since 2026-06-11. Not scheduled for removal; the API may change in any release.
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
  const value = useComposerInputValue();
  const isDisabled = useComposerInputDisabled(options?.disabled);

  const setText = useCallback(
    (text: string) => {
      if (!aui.composer.getState().isEditing) return;
      flushTapSync(() => {
        aui.composer.setText(text);
      });
    },
    [aui],
  );

  const { send: rawSend, disabled: sendDisabled } = useComposerSend();
  const canSend = !sendDisabled && !isDisabled;
  const send = useCallback(
    (sendOptions?: ComposerSendOptions) => {
      if (!canSend) return;
      rawSend(sendOptions);
    },
    [canSend, rawSend],
  );

  return { value, setText, send, isDisabled, canSend };
}

/**
 * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
 */
export type Unstable_TriggerPopoverAriaProps = TriggerPopoverAriaProps;

/**
 * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
 * @example
 * ```tsx
 * const aria = unstable_useTriggerPopoverAriaProps();
 * <textarea {...aria} />
 * ```
 */
export function unstable_useTriggerPopoverAriaProps(): Unstable_TriggerPopoverAriaProps {
  return useTriggerPopoverAriaProps();
}
