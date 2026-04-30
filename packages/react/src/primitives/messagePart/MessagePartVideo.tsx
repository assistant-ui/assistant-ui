"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { useMessagePartVideo } from "./useMessagePartVideo";

export namespace MessagePartPrimitiveVideo {
  export type Element = ComponentRef<typeof Primitive.video>;
  /**
   * Props for the MessagePartPrimitive.Video component.
   * Accepts all standard video element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.video>;
}

/**
 * Renders a video from the current message part context.
 *
 * This component displays video content from the current message part,
 * automatically setting the src and poster attributes from the message part.
 *
 * @example
 * ```tsx
 * <MessagePartPrimitive.Video
 *   className="message-video"
 *   controls
 * />
 * ```
 */
export const MessagePartPrimitiveVideo = forwardRef<
  MessagePartPrimitiveVideo.Element,
  MessagePartPrimitiveVideo.Props
>((props, forwardedRef) => {
  const { url, posterUrl } = useMessagePartVideo();
  return (
    <Primitive.video
      src={url}
      poster={posterUrl}
      controls
      preload="metadata"
      {...props}
      ref={forwardedRef}
    />
  );
});

MessagePartPrimitiveVideo.displayName = "MessagePartPrimitive.Video";
