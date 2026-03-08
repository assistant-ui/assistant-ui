import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace SpanPrimitiveTypeBadge {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const SpanPrimitiveTypeBadge = forwardRef<
  SpanPrimitiveTypeBadge.Element,
  SpanPrimitiveTypeBadge.Props
>((props, ref) => {
  const type = useAuiState((s) => s.span.type);

  return (
    <Primitive.span {...props} ref={ref} data-span-type={type}>
      {props.children ?? type}
    </Primitive.span>
  );
});

SpanPrimitiveTypeBadge.displayName = "SpanPrimitive.TypeBadge";
