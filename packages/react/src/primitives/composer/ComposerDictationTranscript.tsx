"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ComposerPrimitiveDictationTranscript {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

/**
 * Renders the current interim (partial) transcript while dictation is active.
 *
 * This component displays real-time feedback of what the user is saying before
 * the transcription is finalized and committed to the composer input.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.If dictation>
 *   <div className="dictation-preview">
 *     <ComposerPrimitive.DictationTranscript />
 *   </div>
 * </ComposerPrimitive.If>
 * ```
 */
export const ComposerPrimitiveDictationTranscript = forwardRef<
  ComposerPrimitiveDictationTranscript.Element,
  ComposerPrimitiveDictationTranscript.Props
>(({ children, ...props }, forwardRef) => {
  const transcript = useAuiState(
    (s) => s.composer.dictation?.transcript,
  );

  if (!transcript) return null;

  return (
    <Primitive.span {...props} ref={forwardRef}>
      {children ?? transcript}
    </Primitive.span>
  );
});

ComposerPrimitiveDictationTranscript.displayName =
  "ComposerPrimitive.DictationTranscript";
