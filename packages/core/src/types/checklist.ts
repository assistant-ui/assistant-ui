export type ChecklistItemStatus = "pending" | "running" | "complete" | "error";

export interface ChecklistItemData {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  detail?: string;
  children?: ChecklistItemData[];
}

export type ChecklistData = {
  items: ChecklistItemData[];
  title?: string;
};

export const flattenChecklistItems = (
  items: ChecklistItemData[],
): ChecklistItemData[] => {
  const result: ChecklistItemData[] = [];
  const stack = [...items];
  while (stack.length > 0) {
    const item = stack.pop()!;
    result.push(item);
    if (item.children) {
      stack.push(...item.children);
    }
  }
  return result;
};
