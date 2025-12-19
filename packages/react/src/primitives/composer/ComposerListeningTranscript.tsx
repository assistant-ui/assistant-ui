"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useAssistantState } from "../../context";

export namespace ComposerPrimitiveListeningTranscript {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

/**
 * Renders the current interim (partial) transcript while speech recognition is active.
 *
 * This component displays real-time feedback of what the user is saying before
 * the transcription is finalized and committed to the composer input.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.If listening>
 *   <div className="listening-preview">
 *     <ComposerPrimitive.ListeningTranscript />
 *   </div>
 * </ComposerPrimitive.If>
 * ```
 */
export const ComposerPrimitiveListeningTranscript = forwardRef<
  ComposerPrimitiveListeningTranscript.Element,
  ComposerPrimitiveListeningTranscript.Props
>(({ children, ...props }, forwardRef) => {
  const transcript = useAssistantState(
    ({ composer }) => composer.listening?.transcript,
  );

  if (!transcript) return null;

  return (
    <Primitive.span {...props} ref={forwardRef}>
      {children ?? transcript}
    </Primitive.span>
  );
});

ComposerPrimitiveListeningTranscript.displayName =
  "ComposerPrimitive.ListeningTranscript";
