import { Primitive } from "@radix-ui/react-primitive";
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from "react";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const AttachmentPrimitiveRoot = forwardRef<
  AttachmentPrimitiveRoot.Element,
  AttachmentPrimitiveRoot.Props
>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

AttachmentPrimitiveRoot.displayName = "AttachmentPrimitive.Root";
