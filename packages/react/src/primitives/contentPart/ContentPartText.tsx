import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartText } from "../../primitive-hooks/contentPart/useContentPartText";

type ContentPartPrimitiveTextElement = ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

export type ContentPartPrimitiveTextProps = Omit<
  PrimitiveSpanProps,
  "children"
>;

export const ContentPartPrimitiveText = forwardRef<
  ContentPartPrimitiveTextElement,
  ContentPartPrimitiveTextProps
>((props, forwardedRef) => {
  const {
    part: { text },
    status,
  } = useContentPartText();

  return (
    <Primitive.span data-status={status} {...props} ref={forwardedRef}>
      {text}
    </Primitive.span>
  );
});

ContentPartPrimitiveText.displayName = "ContentPartPrimitive.Text";
