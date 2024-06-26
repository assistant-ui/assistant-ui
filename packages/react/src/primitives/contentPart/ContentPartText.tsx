import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartText } from "../../primitive-hooks/contentPart/useContentPartText";

type ContentPartTextElement = ElementRef<typeof Primitive.p>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.p>;

type ContentPartTextProps = Omit<PrimitiveSpanProps, "children">;

export const ContentPartText = forwardRef<
  ContentPartTextElement,
  ContentPartTextProps
>((props, forwardedRef) => {
  const text = useContentPartText();

  return (
    <Primitive.p {...props} ref={forwardedRef}>
      {text}
    </Primitive.p>
  );
});

ContentPartText.displayName = "ContentPartText";
