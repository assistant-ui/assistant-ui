import { Primitive } from "@radix-ui/react-primitive";
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;
type AttachmentPrimitiveRootElement = ElementRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveRoot {
  export type Props = PrimitiveDivProps;
}

export const AttachmentPrimitiveRoot = forwardRef<
  AttachmentPrimitiveRootElement,
  AttachmentPrimitiveRoot.Props
>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

AttachmentPrimitiveRoot.displayName = "AttachmentPrimitive.Root";
