"use client";

import {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AssistantCloud } from "assistant-cloud";
import { RemoteThreadListAdapter } from "../types";
import { useAssistantCloudThreadHistoryAdapter } from "../../../cloud/AssistantCloudThreadHistoryAdapter";
import { RuntimeAdapterProvider } from "../../adapters/RuntimeAdapterProvider";
import { InMemoryThreadListAdapter } from "./in-memory";
import { CloudFileAttachmentAdapter } from "../../adapters";

type ThreadData = {
  externalId: string | undefined;
};

type CloudThreadListAdapterOptions = {
  cloud?: AssistantCloud | undefined;

  create?: (() => Promise<ThreadData>) | undefined;
  delete?: ((threadId: string) => Promise<void>) | undefined;
};

const baseUrl =
  typeof process !== "undefined" &&
  process?.env?.["NEXT_PUBLIC_ASSISTANT_BASE_URL"];
const autoCloud = baseUrl
  ? new AssistantCloud({ baseUrl, anonymous: true })
  : undefined;

export const useCloudThreadListAdapter = (
  adapter: CloudThreadListAdapterOptions,
): RemoteThreadListAdapter => {
  const adapterRef = useRef(adapter);
  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  const unstable_Provider = useCallback<FC<PropsWithChildren>>(
    function Provider({ children }) {
      const history = useAssistantCloudThreadHistoryAdapter({
        get current() {
          return adapterRef.current.cloud ?? autoCloud!;
        },
      });
      const cloudInstance = adapterRef.current.cloud ?? autoCloud!;
      const attachments = useMemo(
        () => new CloudFileAttachmentAdapter(cloudInstance),
        [cloudInstance],
      );

      const adapters = useMemo(
        () => ({
          history,
          attachments,
        }),
        [history, attachments],
      );

      return (
        <RuntimeAdapterProvider adapters={adapters}>
          {children}
        </RuntimeAdapterProvider>
      );
    },
    [],
  );

  const cloud = adapter.cloud ?? autoCloud;
  if (!cloud) return new InMemoryThreadListAdapter();

  return {
    list: async () => {
      try {
        const { threads } = await cloud.threads.list();
        return {
          threads: threads.map((t) => ({
            status: t.is_archived ? "archived" : "regular",
            remoteId: t.id,
            title: t.title,
            externalId: t.external_id ?? undefined,
          })),
        };
      } catch (error) {
        console.warn("Failed to load cloud threads:", error);
        return { threads: [] };
      }
    },

    initialize: async () => {
      try {
        const createTask = adapter.create?.() ?? Promise.resolve();
        const t = await createTask;
        const external_id = t ? t.externalId : undefined;
        const { thread_id: remoteId } = await cloud.threads.create({
          last_message_at: new Date(),
          external_id,
        });

        return { externalId: external_id, remoteId: remoteId };
      } catch (error) {
        console.warn("Failed to initialize cloud thread:", error);
        throw error; // Re-throw for initialize as it's critical
      }
    },

    rename: async (threadId, newTitle) => {
      try {
        return cloud.threads.update(threadId, { title: newTitle });
      } catch (error) {
        console.warn("Failed to rename cloud thread:", error);
        throw error; // Re-throw for rename as it's user-initiated
      }
    },
    archive: async (threadId) => {
      try {
        return cloud.threads.update(threadId, { is_archived: true });
      } catch (error) {
        console.warn("Failed to archive cloud thread:", error);
        throw error; // Re-throw for archive as it's user-initiated
      }
    },
    unarchive: async (threadId) => {
      try {
        return cloud.threads.update(threadId, { is_archived: false });
      } catch (error) {
        console.warn("Failed to unarchive cloud thread:", error);
        throw error; // Re-throw for unarchive as it's user-initiated
      }
    },
    delete: async (threadId) => {
      try {
        await adapter.delete?.(threadId);
        return cloud.threads.delete(threadId);
      } catch (error) {
        console.warn("Failed to delete cloud thread:", error);
        throw error; // Re-throw for delete as it's user-initiated
      }
    },

    generateTitle: async (threadId, messages) => {
      try {
        return cloud.runs.stream({
          thread_id: threadId,
          assistant_id: "system/thread_title",
          messages: messages, // TODO serialize these to a more efficient format
        });
      } catch (error) {
        console.warn("Failed to generate cloud thread title:", error);
        throw error; // Re-throw for generateTitle as it's user-initiated
      }
    },

    unstable_Provider,
  };
};
