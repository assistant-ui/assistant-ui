import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { QueuePlacement } from "../../runtime/queue/external-thread-queue-adapter";
import type { QueueItemState } from "../scopes/queue-item";

const useQueueItemClient = ({
  item,
  onMove,
  onRemove,
}: {
  item: QueueItemState;
  onMove: (placement: QueuePlacement) => void;
  onRemove: () => void;
}): ClientOutput<"queueItem"> => {
  return {
    getState: () => item,
    steer: () => onMove({ lane: "steer", insertAfter: null }),
    move: onMove,
    remove: onRemove,
  };
};

export const QueueItemClient = resource(useQueueItemClient);
