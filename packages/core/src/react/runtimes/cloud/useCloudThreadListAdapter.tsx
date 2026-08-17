declare const process: { env: Record<string, string | undefined> };

import {
  type FC,
  type PropsWithChildren,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AssistantCloud } from "assistant-cloud";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import { InMemoryThreadListAdapter } from "../../../runtimes/remote-thread-list/adapter/in-memory";
import { useAssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";
import {
  RuntimeAdapterProvider,
  type RuntimeAdapters,
} from "../RuntimeAdapterProvider";
import { CloudFileAttachmentAdapter } from "./CloudFileAttachmentAdapter";
import { isRecord } from "../../../utils/json/is-json";

type ThreadData = {
  externalId: string | undefined;
};

type CloudThreadListAdapterOptions = {
  cloud?: AssistantCloud | undefined;

  create?: (() => Promise<ThreadData>) | undefined;
  delete?: ((threadId: string) => Promise<void>) | undefined;
};

const toCustom = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

const baseUrl =
  typeof process !== "undefined" &&
  process?.env?.NEXT_PUBLIC_ASSISTANT_BASE_URL;
const autoCloud = baseUrl
  ? new AssistantCloud({ baseUrl, anonymous: true })
  : undefined;

const CLOUD_THREAD_PAGE_SIZE = 20;

const useCloudThreadListAdapters = (
  adapterRef: RefObject<CloudThreadListAdapterOptions>,
): RuntimeAdapters => {
  const history = useAssistantCloudThreadHistoryAdapter({
    get current() {
      return adapterRef.current.cloud ?? autoCloud!;
    },
  });
  const [attachments] = useState(
    () =>
      new CloudFileAttachmentAdapter(
        () => adapterRef.current.cloud ?? autoCloud!,
      ),
  );
  return useMemo(
    () => ({
      history,
      attachments,
    }),
    [history, attachments],
  );
};

export const useCloudThreadListAdapter = (
  adapter: CloudThreadListAdapterOptions,
): RemoteThreadListAdapter => {
  const adapterRef = useRef(adapter);
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  const unstable_useAdapters = useCallback(function useCloudAdapters() {
    return useCloudThreadListAdapters(adapterRef);
  }, []);

  const unstable_Provider = useCallback<FC<PropsWithChildren>>(
    function Provider({ children }) {
      const adapters = useCloudThreadListAdapters(adapterRef);
      return (
        <RuntimeAdapterProvider adapters={adapters}>
          {children}
        </RuntimeAdapterProvider>
      );
    },
    [],
  );

  const cloud = adapter.cloud ?? autoCloud;
  return useMemo<RemoteThreadListAdapter>(() => {
    if (!cloud) {
      const ref = adapterRef;
      const inMemory = new InMemoryThreadListAdapter();
      inMemory.initialize = async (threadId: string) => {
        const result = await ref.current.create?.();
        return { remoteId: threadId, externalId: result?.externalId };
      };
      return inMemory;
    }

    return {
      list: async ({ after } = {}) => {
        const { threads } = await cloud.threads.list({
          limit: CLOUD_THREAD_PAGE_SIZE,
          ...(after ? { after } : {}),
        });
        return {
          threads: threads.map((t) => ({
            status: t.is_archived ? "archived" : "regular",
            remoteId: t.id,
            title: t.title,
            lastMessageAt: t.last_message_at
              ? new Date(t.last_message_at)
              : undefined,
            externalId: t.external_id ?? undefined,
            custom: toCustom(t.metadata),
          })),
          nextCursor:
            threads.length === CLOUD_THREAD_PAGE_SIZE
              ? threads.at(-1)?.id
              : undefined,
        };
      },

      initialize: async () => {
        const createTask = adapterRef.current.create?.() ?? Promise.resolve();
        const t = await createTask;
        const external_id = t ? t.externalId : undefined;
        const { thread_id: remoteId } = await cloud.threads.create({
          last_message_at: new Date(),
          external_id,
        });

        return { externalId: external_id, remoteId: remoteId };
      },

      rename: async (threadId, newTitle) => {
        return cloud.threads.update(threadId, { title: newTitle });
      },
      updateCustom: async (threadId, custom) => {
        return cloud.threads.update(threadId, { metadata: custom ?? null });
      },
      archive: async (threadId) => {
        return cloud.threads.update(threadId, { is_archived: true });
      },
      unarchive: async (threadId) => {
        return cloud.threads.update(threadId, { is_archived: false });
      },
      delete: async (threadId) => {
        await adapterRef.current.delete?.(threadId);
        return cloud.threads.delete(threadId);
      },

      generateTitle: async (threadId, messages) => {
        // Filter messages to only include content types the title generator understands
        // (reasoning, source, etc. are not needed for title generation)
        // TODO serialize these to a more efficient format
        const filteredMessages = messages.map((msg) => ({
          ...msg,
          content: msg.content.filter(
            (part) => part.type === "text" || part.type === "tool-call",
          ),
        }));

        return cloud.runs.stream({
          thread_id: threadId,
          assistant_id: "system/thread_title",
          messages: filteredMessages,
        });
      },

      fetch: async (threadId: string) => {
        const thread = await cloud.threads.get(threadId);
        return {
          status: thread.is_archived ? "archived" : "regular",
          remoteId: thread.id,
          title: thread.title,
          lastMessageAt: thread.last_message_at
            ? new Date(thread.last_message_at)
            : undefined,
          externalId: thread.external_id ?? undefined,
          custom: toCustom(thread.metadata),
        };
      },

      unstable_Provider,
      unstable_useAdapters,
    };
  }, [cloud, unstable_Provider, unstable_useAdapters]);
};
