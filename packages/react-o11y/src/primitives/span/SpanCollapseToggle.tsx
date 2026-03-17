import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui, useAuiState } from "@assistant-ui/store";

export namespace SpanPrimitiveCollapseToggle {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const SpanPrimitiveCollapseToggle = forwardRef<
  SpanPrimitiveCollapseToggle.Element,
  SpanPrimitiveCollapseToggle.Props
>((props, ref) => {
  const hasChildren = useAuiState((s) => s.span.hasChildren);
  const isCollapsed = useAuiState((s) => s.span.isCollapsed);
  const aui = useAui();

  if (!hasChildren) return null;

  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      data-collapsed={isCollapsed}
      onClick={(e) => {
        e.stopPropagation();
        aui.span().toggleCollapse();
        props.onClick?.(e);
      }}
    />
  );
});

SpanPrimitiveCollapseToggle.displayName = "SpanPrimitive.CollapseToggle";
