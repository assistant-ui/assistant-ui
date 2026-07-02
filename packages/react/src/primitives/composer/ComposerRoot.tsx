"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { useAuiState } from "@assistant-ui/store";
import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  type FormEvent,
  forwardRef,
  type ComponentPropsWithoutRef,
  useMemo,
  useState,
} from "react";
import { useComposerSend } from "./ComposerSend";
import { ComposerCompactContext } from "./ComposerCompactContext";

export namespace ComposerPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.form>;
  /**
   * Props for the ComposerPrimitive.Root component.
   * Accepts all standard form element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.form> & {
    /**
     * Opt the composer into compact mode. While the input holds at most a single
     * line of text and there are no attachments, quote, queued messages, or
     * active dictation, the root renders a `data-compact` attribute so styles
     * can collapse the composer into a single row. It expands automatically
     * when any of those conditions stop holding.
     * @default false
     */
    compact?: boolean | undefined;
  };
}

/**
 * The root form container for message composition.
 *
 * This component provides a form wrapper that handles message submission when the form
 * is submitted (e.g., via Enter key or submit button). It automatically prevents the
 * default form submission and triggers the composer's send functionality.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Root>
 *   <ComposerPrimitive.Input placeholder="Type your message..." />
 *   <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
 * </ComposerPrimitive.Root>
 * ```
 */
export const ComposerPrimitiveRoot = forwardRef<
  ComposerPrimitiveRoot.Element,
  ComposerPrimitiveRoot.Props
>(({ onSubmit, compact, ...rest }, forwardedRef) => {
  const send = useComposerSend();

  const [multiline, setMultiline] = useState(false);
  const compactContext = useMemo(() => ({ setMultiline }), []);
  const stateAllowsCompact = useAuiState((s) =>
    compact
      ? s.composer.attachments.length === 0 &&
        s.composer.quote == null &&
        s.composer.queue.length === 0 &&
        s.composer.dictation == null &&
        !s.composer.text.includes("\n")
      : false,
  );
  const isCompact = stateAllowsCompact && !multiline;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!send) return;
    send();
  };

  return (
    <ComposerCompactContext.Provider value={compactContext}>
      <Primitive.form
        {...rest}
        data-compact={isCompact ? "" : undefined}
        ref={forwardedRef}
        onSubmit={composeEventHandlers(onSubmit, handleSubmit)}
      />
    </ComposerCompactContext.Provider>
  );
});

ComposerPrimitiveRoot.displayName = "ComposerPrimitive.Root";
