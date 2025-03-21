import { RefObject, useState } from "react";
import { useThreadListItemRuntime } from "../context";
import { ThreadHistoryAdapter } from "../runtimes/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtimes/utils/MessageRepository";
import { AssistantCloud } from "./AssistantCloud";
import { ThreadListItemRuntime } from "../api";

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private cloudRef: RefObject<AssistantCloud>,
    private threadListItemRuntime: ThreadListItemRuntime,
  ) {}

  private _getIdForLocalId: Record<string, string | Promise<string>> = {};

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.threadListItemRuntime.initialize();
    const cloud = this.cloudRef.current;
    if (!cloud) throw new Error('Cloud reference is not initialized');
    
    const task = cloud.threads.messages
      .create(remoteId, {
        parent_id: parentId
          ? ((await this._getIdForLocalId[parentId]) ?? parentId)
          : null,
        format: "aui/v0",
        content: cloud.encodeMessage(message), // Use the cloud instance's encodeMessage
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
    
    const cloud = this.cloudRef.current;
    const { messages } = await cloud.threads.messages.list(remoteId);
    
    const payload = {
      messages: messages
        .filter(
          (m): m is typeof m & { format: "aui/v0" } => m.format === "aui/v0",
        )
        .map(cloud.decodeMessage) // Use the cloud instance's decodeMessage
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
