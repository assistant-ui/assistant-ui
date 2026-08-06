import type { AppendMessage } from "../../types/message";
import type { QueueItemState } from "../../store/scopes/queue-item";

export const queueItemToAppendMessage = (
  item: QueueItemState,
  parentId: string | null,
): AppendMessage => ({
  role: "user",
  content: item.parts,
  attachments: [],
  createdAt: new Date(),
  parentId,
  sourceId: null,
  runConfig: {},
  metadata: { custom: {} },
});
