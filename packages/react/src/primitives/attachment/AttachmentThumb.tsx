"use client";

import { ComponentPropsWithoutRef, forwardRef, type ComponentRef } from "react";
import { useAuiState } from "@assistant-ui/store";
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
  const ext = useAuiState((s) => {
    const parts = s.attachment.name.split(".");
    return parts.length > 1 ? parts.pop()! : "";
  });
  return (
    <Primitive.div {...props} ref={ref}>
      .{ext}
    </Primitive.div>
  );
});

AttachmentPrimitiveThumb.displayName = "AttachmentPrimitive.Thumb";
