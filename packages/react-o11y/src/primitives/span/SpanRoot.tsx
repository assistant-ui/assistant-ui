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
  const status = useAuiState((s) => s.span.status);
  const type = useAuiState((s) => s.span.type);
  const depth = useAuiState((s) => s.span.depth);
  const isCollapsed = useAuiState((s) => s.span.isCollapsed);

  return (
    <Primitive.div
      {...props}
      ref={ref}
      data-span-id={spanId}
      data-span-status={status}
      data-span-type={type}
      data-span-depth={depth}
      data-collapsed={isCollapsed}
    />
  );
});

SpanPrimitiveRoot.displayName = "SpanPrimitive.Root";
