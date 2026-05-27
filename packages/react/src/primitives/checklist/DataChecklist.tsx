"use client";

import { makeAssistantDataUI } from "@assistant-ui/core/react";
import type { DataMessagePartProps } from "@assistant-ui/core/react";
import type { ChecklistData, ChecklistItemData } from "@assistant-ui/core";
import { ChecklistPrimitiveRoot } from "./ChecklistRoot";
import { ChecklistPrimitiveItem } from "./ChecklistItem";
import { ChecklistPrimitiveProgress } from "./ChecklistProgress";

export const DataChecklist = (props: DataMessagePartProps<ChecklistData>) => {
  const { items, title, showProgress } = props.data;

  if (!items || items.length === 0) return null;

  return (
    <ChecklistPrimitiveRoot>
      {title ? <span>{title}</span> : null}
      {items.map((item: ChecklistItemData) => (
        <ChecklistPrimitiveItem key={item.id} item={item} />
      ))}
      {showProgress ? <ChecklistPrimitiveProgress items={items} /> : null}
    </ChecklistPrimitiveRoot>
  );
};

DataChecklist.displayName = "DataChecklist";

export const ChecklistDataUI = makeAssistantDataUI<ChecklistData>({
  name: "checklist",
  render: DataChecklist,
});
