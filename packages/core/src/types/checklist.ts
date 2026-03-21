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
  const queue = [...items];
  while (queue.length > 0) {
    const item = queue.shift()!;
    result.push(item);
    if (item.children) {
      queue.push(...item.children);
    }
  }
  return result;
};
