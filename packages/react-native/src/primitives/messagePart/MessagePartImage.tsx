import {
  type ComponentRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
} from "react";
import { Image, type ImageProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export namespace MessagePartPrimitiveImage {
  export type Element = ComponentRef<typeof Image>;
  export type Props = Omit<ImageProps, "source">;
}

export const MessagePartPrimitiveImage: ForwardRefExoticComponent<
  MessagePartPrimitiveImage.Props &
    RefAttributes<MessagePartPrimitiveImage.Element>
> = forwardRef<
  MessagePartPrimitiveImage.Element,
  MessagePartPrimitiveImage.Props
>((props, forwardedRef) => {
  const uri = useAuiState((s) => {
    const part = s.part;
    return part.type === "image" ? part.image : undefined;
  });

  if (uri === undefined) return null;
  return <Image source={{ uri }} {...props} ref={forwardedRef} />;
});

MessagePartPrimitiveImage.displayName = "MessagePartPrimitive.Image";
