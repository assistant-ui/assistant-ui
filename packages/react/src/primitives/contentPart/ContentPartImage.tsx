import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef } from "react";
import { useContentPartContext } from "../../context/ContentPartContext";

type ContentPartImageElement = ElementRef<typeof Primitive.img>;
type PrimitiveImageProps = ComponentPropsWithoutRef<typeof Primitive.img>;

type ContentPartImageProps = PrimitiveImageProps;

export const ContentPartImage = forwardRef<
  ContentPartImageElement,
  ContentPartImageProps
>((props, forwardedRef) => {
  const { useContentPart } = useContentPartContext();

  const image = useContentPart((c) => {
    if (c.part.type !== "image")
      throw new Error(
        "ContentPartImage can only be used inside image content parts.",
      );

    return c.part.image;
  });

  return <Primitive.img src={image} {...props} ref={forwardedRef} />;
});
