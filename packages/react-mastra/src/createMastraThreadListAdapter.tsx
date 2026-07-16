"use client";

import type { StorageThreadType } from "@mastra/core/memory";
import {
  RuntimeAdapterProvider,
  type RemoteThreadListAdapter,
  type RemoteThreadMetadata,
  type ThreadMessage,
} from "@assistant-ui/react";
import { useAui } from "@assistant-ui/store";
import { createAssistantStream } from "assistant-stream";
import { useMemo, type FC, type PropsWithChildren } from "react";
import { createMastraHistoryAdapter } from "./createMastraHistoryAdapter";
import type { MastraThreadListOptions } from "./types";

const STATUS_KEY = "assistantUiStatus";

const splitMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata) return { status: "regular" as const, custom: undefined };
  const { [STATUS_KEY]: rawStatus, ...custom } = metadata;
  return {
    status:
      rawStatus === "archived" ? ("archived" as const) : ("regular" as const),
    custom: Object.keys(custom).length > 0 ? custom : undefined,
  };
};

const toRemoteThread = (thread: StorageThreadType): RemoteThreadMetadata => {
  const { status, custom } = splitMetadata(thread.metadata);
  return {
    status,
    remoteId: thread.id,
    title: thread.title || undefined,
    lastMessageAt: new Date(thread.updatedAt),
    custom,
  };
};

const defaultTitleGenerator = (messages: readonly ThreadMessage[]) => {
  const text = messages
    .find((message) => message.role === "user")
    ?.content.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "New conversation";
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

export const createMastraThreadListAdapter = ({
  client,
  agentId,
  resourceId,
  perPage = 50,
  metadata: initialMetadata,
  titleGenerator = defaultTitleGenerator,
}: MastraThreadListOptions): RemoteThreadListAdapter => {
  const mutationQueues = new Map<string, Promise<void>>();
  const getThread = (threadId: string) =>
    client.getMemoryThread({ threadId, agentId });

  const getOwnedThread = async (threadId: string) => {
    const resource = getThread(threadId);
    const thread = await resource.get();
    if (thread.resourceId !== resourceId) {
      throw new Error(
        `Mastra thread ${threadId} does not belong to this resource.`,
      );
    }
    return { resource, thread };
  };

  const queueMutation = (threadId: string, mutation: () => Promise<void>) => {
    const queued = (mutationQueues.get(threadId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(mutation);
    mutationQueues.set(threadId, queued);
    return queued.finally(() => {
      if (mutationQueues.get(threadId) === queued) {
        mutationQueues.delete(threadId);
      }
    });
  };

  const updateThread = async (
    threadId: string,
    update: {
      title?: string;
      status?: "regular" | "archived";
      custom?: Record<string, unknown>;
    },
  ) =>
    queueMutation(threadId, async () => {
      const { resource, thread } = await getOwnedThread(threadId);
      const currentMetadata = splitMetadata(thread.metadata);
      await resource.update({
        title: update.title ?? thread.title ?? "",
        resourceId: thread.resourceId,
        metadata: {
          ...(update.custom ?? currentMetadata.custom),
          [STATUS_KEY]: update.status ?? currentMetadata.status,
        },
      });
    });

  const Provider: FC<PropsWithChildren> = ({ children }) => {
    const aui = useAui();
    const history = useMemo(
      () =>
        createMastraHistoryAdapter({
          client,
          agentId,
          resourceId,
          getThreadId: () => aui.threadListItem().getState().remoteId,
        }),
      [aui],
    );
    const adapters = useMemo(() => ({ history }), [history]);

    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };

  return {
    async list({ after } = {}) {
      const page = after === undefined ? 0 : Number.parseInt(after, 10);
      if (!Number.isSafeInteger(page) || page < 0) {
        throw new Error(`Invalid Mastra thread cursor: ${after}`);
      }
      const result = await client.listMemoryThreads({
        agentId,
        resourceId,
        page,
        perPage,
        orderBy: { field: "updatedAt", direction: "DESC" },
      });
      return {
        threads: result.threads.map(toRemoteThread),
        nextCursor: result.hasMore ? String(page + 1) : undefined,
      };
    },
    async initialize(threadId) {
      const thread = await client.createMemoryThread({
        agentId,
        resourceId,
        threadId,
        metadata: {
          ...initialMetadata,
          [STATUS_KEY]: "regular",
        },
      });
      return { remoteId: thread.id, externalId: undefined };
    },
    async rename(threadId, title) {
      await updateThread(threadId, { title });
    },
    async updateCustom(threadId, custom) {
      await updateThread(threadId, { custom: custom ?? {} });
    },
    async archive(threadId) {
      await updateThread(threadId, { status: "archived" });
    },
    async unarchive(threadId) {
      await updateThread(threadId, { status: "regular" });
    },
    async delete(threadId) {
      await queueMutation(threadId, async () => {
        const { resource } = await getOwnedThread(threadId);
        await resource.delete();
      });
    },
    async fetch(threadId) {
      await mutationQueues.get(threadId)?.catch(() => undefined);
      return toRemoteThread((await getOwnedThread(threadId)).thread);
    },
    async generateTitle(threadId, messages) {
      const title = await titleGenerator(messages);
      await updateThread(threadId, { title });
      return createAssistantStream((controller) => {
        controller.appendText(title);
      });
    },
    unstable_Provider: Provider,
  };
};
