"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import type { ChecklistItemData } from "@assistant-ui/core";

export namespace ChecklistPrimitiveItem {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    item: ChecklistItemData;
  };
}

export const ChecklistPrimitiveItem = forwardRef<
  ChecklistPrimitiveItem.Element,
  ChecklistPrimitiveItem.Props
>(({ item, children, ...props }, ref) => {
  return (
    <Primitive.div data-status={item.status} {...props} ref={ref}>
      {children ?? (
        <>
          <span>{item.text}</span>
          {item.detail ? <span data-detail="">{item.detail}</span> : null}
        </>
      )}
    </Primitive.div>
  );
});

ChecklistPrimitiveItem.displayName = "ChecklistPrimitive.Item";
