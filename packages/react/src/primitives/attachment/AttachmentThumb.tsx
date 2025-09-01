"use client";

import { ComponentPropsWithoutRef, forwardRef, type ComponentRef } from "react";
import { useAssistantState } from "../../context";
import { Primitive } from "@radix-ui/react-primitive";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveThumb {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const AttachmentPrimitiveThumb = forwardRef<
  AttachmentPrimitiveThumb.Element,
  AttachmentPrimitiveThumb.Props
>((props, ref) => {
  const ext = useAssistantState(({ attachment }) => {
    const parts = attachment.name.split(".");
    return parts.length > 1 ? parts.pop()! : "";
  });
  return (
    <Primitive.div {...props} ref={ref}>
      .{ext}
    </Primitive.div>
  );
});

AttachmentPrimitiveThumb.displayName = "AttachmentPrimitive.Thumb";
