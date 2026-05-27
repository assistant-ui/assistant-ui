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
  showProgress?: boolean;
};

export const flattenChecklistItems = (
  items: ChecklistItemData[],
): ChecklistItemData[] => {
  const result: ChecklistItemData[] = [];
  const queue = [...items];
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]!;
    result.push(item);
    if (item.children) {
      queue.push(...item.children);
    }
  }
  return result;
};
