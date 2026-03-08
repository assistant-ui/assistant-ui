import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
  useMemo,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace SpanPrimitiveIndent {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    baseIndent?: number;
    indentPerLevel?: number;
  };
}

export const SpanPrimitiveIndent = forwardRef<
  SpanPrimitiveIndent.Element,
  SpanPrimitiveIndent.Props
>(({ baseIndent = 8, indentPerLevel = 12, style, ...props }, ref) => {
  const depth = useAuiState((s) => s.span.depth);

  const mergedStyle = useMemo(
    () => ({
      ...style,
      paddingLeft: baseIndent + depth * indentPerLevel,
    }),
    [style, baseIndent, depth, indentPerLevel],
  );

  return (
    <Primitive.div
      {...props}
      ref={ref}
      style={mergedStyle}
      data-span-depth={depth}
    />
  );
});

SpanPrimitiveIndent.displayName = "SpanPrimitive.Indent";
