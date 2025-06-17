"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartImage } from "./useContentPartImage";

export namespace ContentPartPrimitiveImage {
  export type Element = ComponentRef<typeof Primitive.img>;
  /**
   * Props for the ContentPartPrimitive.Image component.
   * Accepts all standard img element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.img>;
}

/**
 * Renders an image from the current content part context.
 *
 * This component displays image content from the current content part,
 * automatically setting the src attribute from the content part's image data.
 *
 * @example
 * ```tsx
 * <ContentPartPrimitive.Image
 *   alt="Generated image"
 *   className="message-image"
 *   style={{ maxWidth: '100%' }}
 * />
 * ```
 */
export const ContentPartPrimitiveImage = forwardRef<
  ContentPartPrimitiveImage.Element,
  ContentPartPrimitiveImage.Props
>((props, forwardedRef) => {
  const { image } = useContentPartImage();
  return <Primitive.img src={image} {...props} ref={forwardedRef} />;
});

ContentPartPrimitiveImage.displayName = "ContentPartPrimitive.Image";
