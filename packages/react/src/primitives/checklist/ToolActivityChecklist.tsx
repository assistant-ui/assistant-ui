"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useToolActivityChecklist } from "@assistant-ui/core/react";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistPrimitiveRoot } from "./ChecklistRoot";
import { ChecklistPrimitiveItem } from "./ChecklistItem";
import { ChecklistPrimitiveProgress } from "./ChecklistProgress";

export namespace ToolActivityChecklist {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    title?: string | undefined;
    showProgress?: boolean | undefined;
    maxDepth?: number | undefined;
    renderItem?:
      | ((props: { item: ChecklistItemData; depth: number }) => ReactNode)
      | undefined;
    formatToolName?: ((toolName: string) => string) | undefined;
  };
}

export const ToolActivityChecklist = forwardRef<
  ToolActivityChecklist.Element,
  ToolActivityChecklist.Props
>(
  (
    { title, showProgress, maxDepth, renderItem, formatToolName, ...props },
    ref,
  ) => {
    const items = useToolActivityChecklist(
      formatToolName ? { formatToolName } : undefined,
    );

    if (items.length === 0) return null;

    return (
      <ChecklistPrimitiveRoot {...props} ref={ref}>
        {title ? <span>{title}</span> : null}
        {items.map((item) => (
          <ChecklistPrimitiveItem
            key={item.id}
            item={item}
            maxDepth={maxDepth}
            renderItem={renderItem}
          />
        ))}
        {showProgress ? <ChecklistPrimitiveProgress items={items} /> : null}
      </ChecklistPrimitiveRoot>
    );
  },
);

ToolActivityChecklist.displayName = "ToolActivityChecklist";
