import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartImage } from "../../primitive-hooks/contentPart/useContentPartImage";

export namespace ContentPartPrimitiveImage {
  export type Element = ElementRef<typeof Primitive.img>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.img>;
}

export const ContentPartPrimitiveImage = forwardRef<
  ContentPartPrimitiveImage.Element,
  ContentPartPrimitiveImage.Props
>((props, forwardedRef) => {
  const { image } = useContentPartImage();
  return <Primitive.img src={image} {...props} ref={forwardedRef} />;
});

ContentPartPrimitiveImage.displayName = "ContentPartPrimitive.Image";
