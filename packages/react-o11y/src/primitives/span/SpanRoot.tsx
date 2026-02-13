import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace SpanPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const SpanPrimitiveRoot = forwardRef<
  SpanPrimitiveRoot.Element,
  SpanPrimitiveRoot.Props
>((props, ref) => {
  const spanId = useAuiState((s) => s.span.id);

  return <Primitive.div {...props} ref={ref} data-span-id={spanId} />;
});

SpanPrimitiveRoot.displayName = "SpanPrimitive.Root";
