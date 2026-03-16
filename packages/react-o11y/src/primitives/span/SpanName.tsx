import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace SpanPrimitiveName {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const SpanPrimitiveName = forwardRef<
  SpanPrimitiveName.Element,
  SpanPrimitiveName.Props
>((props, ref) => {
  const name = useAuiState((s) => s.span.name);

  return (
    <Primitive.span {...props} ref={ref}>
      {props.children ?? name}
    </Primitive.span>
  );
});

SpanPrimitiveName.displayName = "SpanPrimitive.Name";
