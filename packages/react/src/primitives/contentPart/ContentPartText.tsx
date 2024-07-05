import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartText } from "../../primitive-hooks/contentPart/useContentPartText";
import { useSmooth } from "../../utils/hooks/useSmooth";

type ContentPartPrimitiveTextElement = ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

export type ContentPartPrimitiveTextProps = Omit<
  PrimitiveSpanProps,
  "children"
> & { smooth?: boolean };

export const ContentPartPrimitiveText = forwardRef<
  ContentPartPrimitiveTextElement,
  ContentPartPrimitiveTextProps
>(({ smooth = true, ...rest }, forwardedRef) => {
  const {
    status,
    part: { text },
  } = useContentPartText();
  const smoothText = useSmooth(text, smooth);

  return (
    <Primitive.span data-status={status} {...rest} ref={forwardedRef}>
      {smoothText}
    </Primitive.span>
  );
});

ContentPartPrimitiveText.displayName = "ContentPartPrimitive.Text";
