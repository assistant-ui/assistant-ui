"use client";

import { ComponentPropsWithoutRef, forwardRef, type ElementRef } from "react";
import { useAttachment } from "../../context/react/AttachmentContext";
import { Primitive } from "@radix-ui/react-primitive";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveThumb {
  export type Element = ElementRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const AttachmentPrimitiveThumb = forwardRef<
  AttachmentPrimitiveThumb.Element,
  AttachmentPrimitiveThumb.Props
>(() => {
  const ext = useAttachment((a) => a.name.split(".").pop());
  return <Primitive.div>.{ext}</Primitive.div>;
});

AttachmentPrimitiveThumb.displayName = "AttachmentPrimitive.Thumb";
