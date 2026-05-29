import { makeAssistantDataUI } from "@assistant-ui/core/react";
import type { DataMessagePartProps } from "@assistant-ui/core/react";
import type { ChecklistData } from "@assistant-ui/core";
import { ChecklistView } from "./ChecklistView";

export const DataChecklist = (props: DataMessagePartProps<ChecklistData>) => {
  const { items, title, showProgress } = props.data;

  if (!items || items.length === 0) return null;

  return (
    <ChecklistView items={items} title={title} showProgress={showProgress} />
  );
};

DataChecklist.displayName = "DataChecklist";

export const ChecklistDataUI = makeAssistantDataUI<ChecklistData>({
  name: "checklist",
  render: DataChecklist,
});
