"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { ChecklistItemData } from "@assistant-ui/core";

export namespace ChecklistPrimitiveItem {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    item: ChecklistItemData;
    depth?: number | undefined;
    maxDepth?: number | undefined;
    renderItem?:
      | ((props: { item: ChecklistItemData; depth: number }) => ReactNode)
      | undefined;
  };
}

export const ChecklistPrimitiveItem = forwardRef<
  ChecklistPrimitiveItem.Element,
  ChecklistPrimitiveItem.Props
>(({ item, depth = 0, maxDepth = 2, renderItem, ...props }, ref) => {
  const children =
    item.children && depth < maxDepth
      ? item.children.map((child) => (
          <ChecklistPrimitiveItem
            key={child.id}
            item={child}
            depth={depth + 1}
            maxDepth={maxDepth}
            renderItem={renderItem}
          />
        ))
      : null;

  if (renderItem) {
    return (
      <>
        {renderItem({ item, depth })}
        {children}
      </>
    );
  }

  return (
    <Primitive.div data-status={item.status} {...props} ref={ref}>
      <span>{item.text}</span>
      {item.detail ? <span data-detail="">{item.detail}</span> : null}
      {children}
    </Primitive.div>
  );
});

ChecklistPrimitiveItem.displayName = "ChecklistPrimitive.Item";
