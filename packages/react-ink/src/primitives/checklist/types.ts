export type ChecklistItemStatus = "pending" | "running" | "complete" | "error";

export interface ChecklistItemData {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  detail?: string;
  children?: ChecklistItemData[];
}
