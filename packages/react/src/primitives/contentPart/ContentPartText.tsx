import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartText } from "../../primitive-hooks/contentPart/useContentPartText";

type ContentPartPrimitiveTextElement = ElementRef<typeof Primitive.p>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.p>;

export type ContentPartPrimitiveTextProps = Omit<
  PrimitiveSpanProps,
  "children"
>;

export const ContentPartPrimitiveText = forwardRef<
  ContentPartPrimitiveTextElement,
  ContentPartPrimitiveTextProps
>((props, forwardedRef) => {
  const text = useContentPartText();

  return (
    <Primitive.p {...props} ref={forwardedRef}>
      {text}
    </Primitive.p>
  );
});

ContentPartPrimitiveText.displayName = "ContentPartPrimitive.Text";
