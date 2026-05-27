import { Text } from "ink";
import { makeAssistantDataUI } from "@assistant-ui/core/react";
import type { DataMessagePartProps } from "@assistant-ui/core/react";
import type { ChecklistItemData, ChecklistData } from "@assistant-ui/core";
import { ChecklistRoot } from "./ChecklistRoot";
import { ChecklistItem } from "./ChecklistItem";
import { ChecklistProgress } from "./ChecklistProgress";

export const DataChecklist = (props: DataMessagePartProps<ChecklistData>) => {
  const { items, title, showProgress } = props.data;

  if (!items || items.length === 0) return null;

  return (
    <ChecklistRoot>
      {title ? <Text bold>{title}</Text> : null}
      {items.map((item: ChecklistItemData) => (
        <ChecklistItem key={item.id} item={item} />
      ))}
      {showProgress ? <ChecklistProgress items={items} /> : null}
    </ChecklistRoot>
  );
};

DataChecklist.displayName = "DataChecklist";

export const ChecklistDataUI = makeAssistantDataUI<ChecklistData>({
  name: "checklist",
  render: DataChecklist,
});
