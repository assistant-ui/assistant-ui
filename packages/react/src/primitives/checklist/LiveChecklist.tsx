"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistPrimitiveRoot } from "./ChecklistRoot";
import { ChecklistPrimitiveItem } from "./ChecklistItem";
import { ChecklistPrimitiveProgress } from "./ChecklistProgress";
import { ToolActivityChecklist } from "./ToolActivityChecklist";

export namespace LiveChecklist {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    items?: ChecklistItemData[] | undefined;
    formatToolName?: ((toolName: string) => string) | undefined;
    title?: string | undefined;
    showProgress?: boolean | undefined;
    maxDepth?: number | undefined;
    renderItem?:
      | ((props: { item: ChecklistItemData; depth: number }) => ReactNode)
      | undefined;
  };
}

export const LiveChecklist = forwardRef<
  LiveChecklist.Element,
  LiveChecklist.Props
>(
  (
    {
      items,
      formatToolName,
      title,
      showProgress,
      maxDepth,
      renderItem,
      ...props
    },
    ref,
  ) => {
    if (!items) {
      return (
        <ToolActivityChecklist
          title={title}
          showProgress={showProgress}
          maxDepth={maxDepth}
          renderItem={renderItem}
          formatToolName={formatToolName}
          {...props}
          ref={ref}
        />
      );
    }

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

LiveChecklist.displayName = "LiveChecklist";
