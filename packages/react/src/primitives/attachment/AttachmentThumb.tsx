"use client";

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ComponentRef,
} from "react";
import { useAuiState } from "@assistant-ui/store";
import { Primitive } from "../../utils/Primitive";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace AttachmentPrimitiveThumb {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const AttachmentPrimitiveThumb = forwardRef<
  AttachmentPrimitiveThumb.Element,
  AttachmentPrimitiveThumb.Props
>((props, ref) => {
  const label = useAuiState((s) => {
    const name = s.attachment.name;
    const dot = name.lastIndexOf(".");
    if (dot > 0 && dot < name.length - 1) {
      return `.${name.slice(dot + 1)}`;
    }
    return s.attachment.type;
  });
  return (
    <Primitive.div {...props} ref={ref}>
      {props.children ?? label}
    </Primitive.div>
  );
});

AttachmentPrimitiveThumb.displayName = "AttachmentPrimitive.unstable_Thumb";
