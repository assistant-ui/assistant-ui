import { RefObject, useState } from "react";
import { useThreadListItemRuntime } from "../context";
import { ThreadHistoryAdapter } from "../runtimes/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtimes/utils/MessageRepository";
import { AssistantCloud } from "./AssistantCloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import { ThreadListItemRuntime } from "../api";

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private cloudRef: RefObject<AssistantCloud>,
    private threadListItemRuntime: ThreadListItemRuntime,
  ) {}

  private _getIdForLocalId: Record<string, string | Promise<string>> = {};

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.threadListItemRuntime.initialize();
    const task = this.cloudRef.current.threads.messages
      .create(remoteId, {
        parent_id: parentId
          ? ((await this._getIdForLocalId[parentId]) ?? parentId)
          : null,
        format: "aui/v0",
        content: auiV0Encode(message),
      })
      .then(({ message_id }) => {
        this._getIdForLocalId[message.id] = message_id;
        return message_id;
      });

    this._getIdForLocalId[message.id] = task;

    return task.then(() => {});
  }

  async load() {
    const remoteId = this.threadListItemRuntime.getState().remoteId;
    if (!remoteId) return { messages: [] };
    const { messages } =
      await this.cloudRef.current.threads.messages.list(remoteId);
    const payload = {
      messages: messages
        .filter(
          (m): m is typeof m & { format: "aui/v0" } => m.format === "aui/v0",
        )
        .map(auiV0Decode)
        .reverse(),
    };
    return payload;
  }
}

export const useAssistantCloudThreadHistoryAdapter = (
  cloudRef: RefObject<AssistantCloud>,
): ThreadHistoryAdapter => {
  const threadListItemRuntime = useThreadListItemRuntime();
  const [adapter] = useState(
    () =>
      new AssistantCloudThreadHistoryAdapter(cloudRef, threadListItemRuntime),
  );

  return adapter;
};
