import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace SpanPrimitiveStatusIndicator {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const SpanPrimitiveStatusIndicator = forwardRef<
  SpanPrimitiveStatusIndicator.Element,
  SpanPrimitiveStatusIndicator.Props
>((props, ref) => {
  const status = useAuiState((s) => s.span.status);

  return <Primitive.span {...props} ref={ref} data-span-status={status} />;
});

SpanPrimitiveStatusIndicator.displayName = "SpanPrimitive.StatusIndicator";
