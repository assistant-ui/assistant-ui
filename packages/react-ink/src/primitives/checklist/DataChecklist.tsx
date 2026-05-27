import { makeAssistantDataUI } from "@assistant-ui/core/react";
import type { DataMessagePartProps } from "@assistant-ui/core/react";
import type { ChecklistData } from "@assistant-ui/core";
import { ChecklistView } from "./ChecklistView";

export const DataChecklist = (props: DataMessagePartProps<ChecklistData>) => {
  const { items, title, showProgress } = props.data;

  if (!items) return null;

  return (
    <ChecklistView
      items={items}
      {...(title ? { title } : undefined)}
      {...(showProgress ? { showProgress } : undefined)}
    />
  );
};

DataChecklist.displayName = "DataChecklist";

export const ChecklistDataUI = makeAssistantDataUI<ChecklistData>({
  name: "checklist",
  render: DataChecklist,
});
