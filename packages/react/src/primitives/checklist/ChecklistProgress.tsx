"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import type { ChecklistItemData } from "@assistant-ui/core";
import { flattenChecklistItems } from "@assistant-ui/core";

export namespace ChecklistPrimitiveProgress {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    items: ChecklistItemData[];
  };
}

export const ChecklistPrimitiveProgress = forwardRef<
  ChecklistPrimitiveProgress.Element,
  ChecklistPrimitiveProgress.Props
>(({ items, ...props }, ref) => {
  const flat = flattenChecklistItems(items);
  const done = flat.filter(
    (i) => i.status === "complete" || i.status === "error",
  ).length;
  const total = flat.length;

  return (
    <Primitive.div data-done={done} data-total={total} {...props} ref={ref}>
      {done}/{total} complete
    </Primitive.div>
  );
});

ChecklistPrimitiveProgress.displayName = "ChecklistPrimitive.Progress";
