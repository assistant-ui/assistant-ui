import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";

export namespace McpManagerPrimitiveAddCustomTrigger {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpManagerPrimitiveAddCustomTrigger = forwardRef<
  McpManagerPrimitiveAddCustomTrigger.Element,
  McpManagerPrimitiveAddCustomTrigger.Props
>((props, ref) => {
  return <Primitive.button {...props} type="button" ref={ref} />;
});

McpManagerPrimitiveAddCustomTrigger.displayName =
  "McpManagerPrimitive.AddCustomTrigger";
