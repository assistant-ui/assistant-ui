"use client";

import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useMessagePartAudio } from "./useMessagePartAudio";

export namespace MessagePartPrimitiveAudio {
  export type Element = ComponentRef<"audio">;
  /**
   * Props for the MessagePartPrimitive.Audio component.
   * Accepts all standard audio element props.
   */
  export type Props = ComponentPropsWithoutRef<"audio">;
}

/**
 * Renders an audio player from the current message part context.
 *
 * This component displays audio content from the current message part,
 * automatically setting the src attribute from the message part's audio data.
 *
 * @example
 * ```tsx
 * <MessagePartPrimitive.Audio
 *   controls
 *   className="message-audio"
 * />
 * ```
 */
export const MessagePartPrimitiveAudio = forwardRef<
  MessagePartPrimitiveAudio.Element,
  MessagePartPrimitiveAudio.Props
>((props, forwardedRef) => {
  const part = useMessagePartAudio();
  const src = part.audio.data;
  return <audio src={src} {...props} ref={forwardedRef} />;
});

MessagePartPrimitiveAudio.displayName = "MessagePartPrimitive.Audio";
