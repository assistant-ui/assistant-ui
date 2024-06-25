import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartImage } from "../../primitive-hooks/contentPart/useContentPartImage";

type ContentPartImageElement = ElementRef<typeof Primitive.img>;
type PrimitiveImageProps = ComponentPropsWithoutRef<typeof Primitive.img>;

type ContentPartImageProps = PrimitiveImageProps;

export const ContentPartImage = forwardRef<
  ContentPartImageElement,
  ContentPartImageProps
>((props, forwardedRef) => {
  const image = useContentPartImage();
  return <Primitive.img src={image} {...props} ref={forwardedRef} />;
});

ContentPartImage.displayName = "ContentPartImage";
