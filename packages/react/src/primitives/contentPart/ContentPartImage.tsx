import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartImage } from "../../primitive-hooks/contentPart/useContentPartImage";

type ContentPartPrimitiveImageElement = ElementRef<typeof Primitive.img>;
type PrimitiveImageProps = ComponentPropsWithoutRef<typeof Primitive.img>;

export type ContentPartPrimitiveImageProps = PrimitiveImageProps;

export const ContentPartPrimitiveImage = forwardRef<
  ContentPartPrimitiveImageElement,
  ContentPartPrimitiveImageProps
>((props, forwardedRef) => {
  const {
    part: { image },
  } = useContentPartImage();
  return <Primitive.img src={image} {...props} ref={forwardedRef} />;
});

ContentPartPrimitiveImage.displayName = "ContentPartPrimitive.Image";
