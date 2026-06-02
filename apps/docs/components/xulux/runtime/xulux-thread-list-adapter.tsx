"use client";

import { createAssistantStream } from "assistant-stream";
import { type FC, type PropsWithChildren, useMemo } from "react";
import {
  RuntimeAdapterProvider,
  useAui,
  type MessageFormatAdapter,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  deleteXuluxMessages,
  findXuluxThread,
  readXuluxMessages,
  readXuluxThreads,
  updateXuluxThread,
  upsertXuluxThread,
  writeXuluxMessages,
  writeXuluxThreads,
  type XuluxStoredMessageRow,
  type XuluxStoredThread,
} from "./xulux-local-storage";

function getTextFromMessages(messages: readonly ThreadMessage[]): string {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "New chat";
}

function titleFromMessages(messages: readonly ThreadMessage[]): string {
  const text = getTextFromMessages(messages);
  return text.length > 44 ? `${text.slice(0, 41)}...` : text;
}

function toRemoteThread(thread: XuluxStoredThread) {
  return {
    remoteId: thread.remoteId,
    externalId: thread.externalId,
    status: thread.status,
    title: thread.title,
    custom: thread.custom,
  };
}

function upsertMessage(
  messages: XuluxStoredMessageRow[],
  row: XuluxStoredMessageRow,
) {
  const index = messages.findIndex((message) => message.id === row.id);
  return index === -1
    ? [...messages, row]
    : messages.map((message, messageIndex) =>
        messageIndex === index ? row : message,
      );
}

class XuluxLocalHistoryAdapter implements ThreadHistoryAdapter {
  constructor(private aui: ReturnType<typeof useAui>) {}

  async load() {
    return { messages: [] };
  }

  async append() {}

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    fmt: MessageFormatAdapter<TMessage, TStorageFormat>,
  ) {
    const adapter = this;
    return {
      async load() {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return { headId: null, messages: [] };
        const repository = readXuluxMessages(remoteId);
        return {
          headId: repository.headId ?? null,
          messages: repository.messages
            .filter((row) => row.format === fmt.format)
            .map((row) =>
              fmt.decode({
                id: row.id,
                parent_id: row.parent_id,
                format: row.format,
                content: row.content as TStorageFormat,
              }),
            ),
        };
      },
      async append(item: { parentId: string | null; message: TMessage }) {
        const { remoteId } = await adapter.aui.threadListItem().initialize();
        const repository = readXuluxMessages(remoteId);
        const row: XuluxStoredMessageRow = {
          id: fmt.getId(item.message),
          parent_id: item.parentId,
          format: fmt.format,
          content: fmt.encode(item),
        };
        writeXuluxMessages(remoteId, {
          headId: row.id,
          messages: upsertMessage(repository.messages, row),
        });
      },
      async update(
        item: { parentId: string | null; message: TMessage },
        localMessageId: string,
      ) {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return;
        const repository = readXuluxMessages(remoteId);
        const row: XuluxStoredMessageRow = {
          id: localMessageId,
          parent_id: item.parentId,
          format: fmt.format,
          content: fmt.encode(item),
        };
        writeXuluxMessages(remoteId, {
          headId: repository.headId ?? null,
          messages: repository.messages.map((message) =>
            message.id === localMessageId ? row : message,
          ),
        });
      },
    };
  }
}

function XuluxLocalHistoryProvider({ children }: PropsWithChildren) {
  const aui = useAui();
  const history = useMemo(() => new XuluxLocalHistoryAdapter(aui), [aui]);
  const adapters = useMemo(() => ({ history }), [history]);
  return (
    <RuntimeAdapterProvider adapters={adapters}>
      {children}
    </RuntimeAdapterProvider>
  );
}

export function createXuluxLocalThreadListAdapter({
  getCurrentSessionId,
}: {
  getCurrentSessionId: () => string;
}): RemoteThreadListAdapter {
  const Provider: FC<PropsWithChildren> = XuluxLocalHistoryProvider;

  return {
    unstable_Provider: Provider,
    async list() {
      return { threads: readXuluxThreads().map(toRemoteThread) };
    },
    async initialize() {
      const sessionId = getCurrentSessionId();
      upsertXuluxThread(sessionId, (existing) => ({
        ...existing,
        remoteId: sessionId,
        status: existing?.status ?? "regular",
        custom: {
          sessionId,
          xuluxStatus: "idle",
          ...existing?.custom,
          updatedAt: Date.now(),
        },
      }));
      return { remoteId: sessionId, externalId: undefined };
    },
    async rename(remoteId, title) {
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        title,
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
    },
    async archive(remoteId) {
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        status: "archived",
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
    },
    async unarchive(remoteId) {
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        status: "regular",
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
    },
    async delete(remoteId) {
      writeXuluxThreads(
        readXuluxThreads().filter((thread) => thread.remoteId !== remoteId),
      );
      deleteXuluxMessages(remoteId);
    },
    async fetch(remoteId) {
      const thread = findXuluxThread(remoteId);
      if (!thread) throw new Error("Thread not found");
      return toRemoteThread(thread);
    },
    async generateTitle(remoteId, messages) {
      const title = titleFromMessages(messages);
      updateXuluxThread(remoteId, (thread) => ({
        ...thread,
        title,
        custom: { ...thread.custom, updatedAt: Date.now() },
      }));
      return createAssistantStream((controller) => {
        controller.appendText(title);
      });
    },
  };
}
