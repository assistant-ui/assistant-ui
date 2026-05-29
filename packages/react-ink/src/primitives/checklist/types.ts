export type ChecklistItemStatus = "pending" | "running" | "complete" | "error";

export type ChecklistItemData = {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  detail?: string;
  children?: ChecklistItemData[];
};

export type ChecklistData = {
  items: ChecklistItemData[];
  title?: string;
  showProgress?: boolean;
};
