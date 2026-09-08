declare const process: { env: Record<string, string | undefined> };

import { type RefObject, useMemo, useState } from "react";
import { AssistantCloud } from "assistant-cloud";
import type {
  RemoteThreadListAdapter,
  RuntimeAdapters,
} from "../../../runtimes/remote-thread-list/types";
import { InMemoryThreadListAdapter } from "../../../runtimes/remote-thread-list/adapter/in-memory";
import { useAssistantCloudThreadHistoryAdapter } from "./AssistantCloudThreadHistoryAdapter";
import { CloudFileAttachmentAdapter } from "./CloudFileAttachmentAdapter";
import { isRecord } from "../../../utils/json/is-json";

type ThreadData = {
  externalId: string | undefined;
};

export type CloudThreadListAdapterOptions = {
  cloud?: AssistantCloud | undefined;

  create?: (() => Promise<ThreadData>) | undefined;
  delete?: ((threadId: string) => Promise<void>) | undefined;
};

const toCustom = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

const baseUrl =
  typeof process !== "undefined" &&
  process?.env?.NEXT_PUBLIC_ASSISTANT_BASE_URL;
export const autoCloud = baseUrl
  ? new AssistantCloud({ baseUrl, anonymous: true })
  : undefined;

export const useCloudRuntimeAdapters = (
  cloudRef: RefObject<AssistantCloud>,
): RuntimeAdapters => {
  const history = useAssistantCloudThreadHistoryAdapter(cloudRef);
  const [attachments] = useState(
    () => new CloudFileAttachmentAdapter(() => cloudRef.current),
  );
  return useMemo(
    () => ({
      history,
      attachments,
      feedback: history.feedback,
    }),
    [history, attachments],
  );
};

const CLOUD_THREAD_PAGE_SIZE = 20;

type CloudListCursor = {
  activeCursor: string | undefined;
  archivedCursor: string | undefined;
  activeExhausted: boolean;
  archivedExhausted: boolean;
};

const parseListCursor = (after: string | undefined): CloudListCursor => {
  const fallback: CloudListCursor = {
    activeCursor: after,
    archivedCursor: undefined,
    activeExhausted: false,
    archivedExhausted: false,
  };
  if (!after || !after.startsWith("{")) return fallback;
  try {
    const parsed = JSON.parse(after);
    if (!isRecord(parsed)) return fallback;
    return {
      activeCursor: typeof parsed.a === "string" ? parsed.a : undefined,
      archivedCursor: typeof parsed.r === "string" ? parsed.r : undefined,
      activeExhausted: parsed.ae === true,
      archivedExhausted: parsed.re === true,
    };
  } catch {
    return fallback;
  }
};

/**
 * Builds the `RemoteThreadListAdapter` for an assistant-cloud backend without
 * requiring a hook call site, so plain code (a Vue or Svelte setup function,
 * a module-level config) can construct it. Options are read through the
 * getter on every call, so a stable adapter can follow changing `create` and
 * `delete` callbacks; swapping to a different `cloud` instance requires a new
 * adapter (and `reload()` on the list). Without a `cloud` instance (and
 * without `NEXT_PUBLIC_ASSISTANT_BASE_URL`), the adapter falls back to an
 * in-memory list. `useCloudThreadListAdapter` wraps this for the React
 * hook signature.
 */
export const createCloudThreadListAdapter = (
  options:
    | CloudThreadListAdapterOptions
    | (() => CloudThreadListAdapterOptions),
): RemoteThreadListAdapter => {
  const getOptions = typeof options === "function" ? options : () => options;

  const unstable_useAdapters = function useCloudAdapters(): RuntimeAdapters {
    return useCloudRuntimeAdapters({
      get current() {
        return getOptions().cloud ?? autoCloud!;
      },
    });
  };

  const cloud = getOptions().cloud ?? autoCloud;
  if (!cloud) {
    const inMemory = new InMemoryThreadListAdapter();
    inMemory.initialize = async (threadId: string) => {
      const result = await getOptions().create?.();
      return { remoteId: threadId, externalId: result?.externalId };
    };
    return inMemory;
  }

  return {
    list: async ({ after } = {}) => {
      const {
        activeCursor,
        archivedCursor,
        activeExhausted,
        archivedExhausted,
      } = parseListCursor(after);
      const [{ threads: activeThreads }, { threads: archivedThreads }] =
        await Promise.all([
          activeExhausted
            ? Promise.resolve({ threads: [] })
            : cloud.threads.list({
                limit: CLOUD_THREAD_PAGE_SIZE,
                ...(activeCursor ? { after: activeCursor } : {}),
              }),
          archivedExhausted
            ? Promise.resolve({ threads: [] })
            : cloud.threads.list({
                is_archived: true,
                limit: CLOUD_THREAD_PAGE_SIZE,
                ...(archivedCursor ? { after: archivedCursor } : {}),
              }),
        ]);
      const activeNext =
        !activeExhausted && activeThreads.length === CLOUD_THREAD_PAGE_SIZE
          ? activeThreads.at(-1)?.id
          : undefined;
      const archivedNext =
        !archivedExhausted && archivedThreads.length === CLOUD_THREAD_PAGE_SIZE
          ? archivedThreads.at(-1)?.id
          : undefined;
      const threads = [...activeThreads, ...archivedThreads];
      return {
        threads: threads.map((t) => ({
          status: t.is_archived ? ("archived" as const) : ("regular" as const),
          remoteId: t.id,
          title: t.title,
          lastMessageAt: t.last_message_at
            ? new Date(t.last_message_at)
            : undefined,
          externalId: t.external_id ?? undefined,
          custom: toCustom(t.metadata),
        })),
        nextCursor:
          activeNext || archivedNext
            ? JSON.stringify({
                a: activeNext,
                r: archivedNext,
                ...(activeNext === undefined ? { ae: true } : {}),
                ...(archivedNext === undefined ? { re: true } : {}),
              })
            : undefined,
      };
    },

    initialize: async () => {
      const createTask = getOptions().create?.() ?? Promise.resolve();
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
      await getOptions().delete?.(threadId);
      return cloud.threads.delete(threadId);
    },

    generateTitle: async (threadId, messages) => {
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
        status: thread.is_archived
          ? ("archived" as const)
          : ("regular" as const),
        remoteId: thread.id,
        title: thread.title,
        lastMessageAt: thread.last_message_at
          ? new Date(thread.last_message_at)
          : undefined,
        externalId: thread.external_id ?? undefined,
        custom: toCustom(thread.metadata),
      };
    },

    unstable_useAdapters,
  };
};
