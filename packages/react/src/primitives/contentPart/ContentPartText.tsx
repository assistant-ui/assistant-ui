import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useContentPartContext } from "../../context/ContentPartContext";

type ContentPartTextElement = ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = ComponentPropsWithoutRef<typeof Primitive.span>;

type ContentPartTextProps = Omit<PrimitiveSpanProps, "children">;

export const ContentPartText = forwardRef<
  ContentPartTextElement,
  ContentPartTextProps
>((props, forwardedRef) => {
  const { useContentPart } = useContentPartContext();

  const text = useContentPart((c) => {
    if (c.part.type !== "text")
      throw new Error(
        "ContentPartText can only be used inside text content parts.",
      );

    return c.part.text;
  });

  return (
    <Primitive.span {...props} ref={forwardedRef}>
      {text}
    </Primitive.span>
  );
});

ContentPartText.displayName = "ContentPartText";
