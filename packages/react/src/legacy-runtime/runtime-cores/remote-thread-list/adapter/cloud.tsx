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
    /**
     * Error handling strategy:
     * - Background operations (list): Log and return empty state for graceful degradation
     * - User-initiated operations (initialize, rename, archive, etc.): Log and throw for proper UI feedback
     */
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
        throw error; // Re-throw for initialize as it's user-initiated
      }
    },

    rename: async (threadId, newTitle) => {
      try {
        return await cloud.threads.update(threadId, { title: newTitle });
      } catch (error) {
        console.warn("Failed to rename cloud thread:", error);
        throw error; // Re-throw for rename as it's user-initiated
      }
    },
    archive: async (threadId) => {
      try {
        return await cloud.threads.update(threadId, { is_archived: true });
      } catch (error) {
        console.warn("Failed to archive cloud thread:", error);
        throw error; // Re-throw for archive as it's user-initiated
      }
    },
    unarchive: async (threadId) => {
      try {
        return await cloud.threads.update(threadId, { is_archived: false });
      } catch (error) {
        console.warn("Failed to unarchive cloud thread:", error);
        throw error; // Re-throw for unarchive as it's user-initiated
      }
    },
    delete: async (threadId) => {
      let localDeleteError: Error | null = null;
      let cloudDeleteError: Error | null = null;

      // Handle local delete independently
      try {
        await adapter.delete?.(threadId);
      } catch (error) {
        localDeleteError =
          error instanceof Error ? error : new Error(String(error));
        console.warn("Failed to delete thread locally:", localDeleteError);
      }

      // Handle cloud delete independently
      try {
        await cloud.threads.delete(threadId);
      } catch (error) {
        cloudDeleteError =
          error instanceof Error ? error : new Error(String(error));
        console.warn("Failed to delete thread from cloud:", cloudDeleteError);
      }

      // Report results based on what succeeded/failed
      if (localDeleteError && cloudDeleteError) {
        // Both failed - throw a combined error
        const combinedError = new Error(
          `Failed to delete thread both locally and from cloud. Local: ${localDeleteError.message}, Cloud: ${cloudDeleteError.message}`,
        );
        console.error("Thread deletion failed completely:", combinedError);
        throw combinedError;
      } else if (localDeleteError) {
        // Only local failed - cloud delete succeeded
        // Even though cloud is source of truth, we need to throw so the optimistic
        // update rolls back and the UI stays consistent with local state
        const error = new Error(
          `Thread deleted from cloud but local deletion failed: ${localDeleteError.message}`,
        );
        console.error("State inconsistency - local deletion failed:", error);
        throw error;
      } else if (cloudDeleteError) {
        // Only cloud failed - local delete succeeded
        console.error(
          "Thread deleted locally but cloud deletion failed - state inconsistency:",
          cloudDeleteError,
        );
        throw cloudDeleteError;
      }
      // Both succeeded - no error to throw
    },

    generateTitle: async (threadId, messages) => {
      try {
        const stream = await cloud.runs.stream({
          thread_id: threadId,
          assistant_id: "system/thread_title",
          messages: messages, // TODO serialize these to a more efficient format
        });

        // Wrap stream to provide proper error handling during consumption.
        // Without this wrapper, mid-stream errors would not be properly
        // propagated to consumers via controller.error()
        let reader: ReadableStreamDefaultReader<any> | null = null;
        return new ReadableStream({
          async start(controller) {
            try {
              reader = stream.getReader();
              try {
                while (true) {
                  const result = await reader.read();
                  if (result.done) break;
                  controller.enqueue(result.value);
                }
                controller.close();
              } finally {
                reader.releaseLock();
                reader = null;
              }
            } catch (error) {
              console.warn("Failed to generate cloud thread title:", error);
              controller.error(error);
            }
          },
          async cancel(reason) {
            console.warn("Cloud thread title generation cancelled:", reason);
            try {
              // Cancel through the reader if it exists, otherwise through the stream
              if (reader) {
                await reader.cancel(reason);
              } else {
                await stream.cancel();
              }
            } catch (error) {
              console.warn("Failed to cancel cloud stream:", error);
            }
          },
        });
      } catch (error) {
        console.warn("Failed to generate cloud thread title:", error);
        throw error; // Re-throw so callers can handle the error
      }
    },

    unstable_Provider,
  };
};
