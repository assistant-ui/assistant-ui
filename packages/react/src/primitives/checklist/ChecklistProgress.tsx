"use client";

import { Primitive } from "../../utils/Primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import type { ChecklistItemData } from "@assistant-ui/core";

export namespace ChecklistPrimitiveProgress {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    items: ChecklistItemData[];
  };
}

const countChecklist = (
  items: ChecklistItemData[],
): { done: number; total: number } => {
  let done = 0;
  let total = 0;
  for (const item of items) {
    total++;
    if (item.status === "complete" || item.status === "error") done++;
    if (item.children) {
      const child = countChecklist(item.children);
      done += child.done;
      total += child.total;
    }
  }
  return { done, total };
};

export const ChecklistPrimitiveProgress = forwardRef<
  ChecklistPrimitiveProgress.Element,
  ChecklistPrimitiveProgress.Props
>(({ items, ...props }, ref) => {
  const { done, total } = countChecklist(items);

  return (
    <Primitive.div data-done={done} data-total={total} {...props} ref={ref}>
      {done}/{total} done
    </Primitive.div>
  );
});

ChecklistPrimitiveProgress.displayName = "ChecklistPrimitive.Progress";
