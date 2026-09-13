declare const process: { env: Record<string, string | undefined> };

import { type RefObject, useInsertionEffect, useMemo, useState } from "react";
import { AssistantCloud, type SdkIdentity } from "assistant-cloud";
import type {
  RemoteThreadListAdapter,
  RuntimeAdapters,
} from "../../../runtimes/remote-thread-list/types";
import { InMemoryThreadListAdapter } from "../../../runtimes/remote-thread-list/adapter/in-memory";
import {
  DEFAULT_CLOUD_SCOPE,
  useScopedAssistantCloudThreadHistoryAdapter,
} from "./AssistantCloudThreadHistoryAdapter";
import { createScopedCloudFileAttachmentAdapter } from "./CloudFileAttachmentAdapter";
import { isRecord } from "../../../utils/json/is-json";
import { CORE_SDK } from "./sdkIdentity";

type ThreadData = {
  externalId: string | undefined;
};

type CloudThreadOwnership = Pick<ReadonlySet<string>, "has">;

const cloudThreadOwnership = new WeakMap<
  RemoteThreadListAdapter,
  CloudThreadOwnership
>();

export const getCloudThreadOwnership = (
  adapter: RemoteThreadListAdapter,
): CloudThreadOwnership | undefined => cloudThreadOwnership.get(adapter);

export const setCloudThreadOwnership = (
  adapter: RemoteThreadListAdapter,
  ownership: CloudThreadOwnership,
): void => {
  cloudThreadOwnership.set(adapter, ownership);
};

export type CloudThreadListAdapterOptions = {
  cloud?: AssistantCloud | undefined;
  /**
   * Stable identity for the account or workspace owning Cloud runtime state.
   * Change it when that scope changes. `useCloudThreadListRuntime` reloads the
   * list after the hook returns a replacement adapter; lower-level
   * `RemoteThreadList` compositions must call their thread-list `reload()`
   * method after publishing that replacement. When omitted, replacing the
   * Cloud client preserves cached runtime state for backward compatibility.
   */
  scopeId?: string | undefined;
  sdk?: SdkIdentity | undefined;

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

type CommittedScopeRef = RefObject<unknown> & {
  update(scope: unknown): void;
  subscribe(listener: (scope: unknown) => void): () => void;
};

const createCommittedScopeRef = (initialScope: unknown): CommittedScopeRef => {
  let current = initialScope;
  const listeners = new Set<(scope: unknown) => void>();
  return {
    get current() {
      return current;
    },
    update(scope) {
      if (Object.is(current, scope)) return;
      current = scope;
      for (const listener of listeners) listener(scope);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const useCloudRuntimeAdapters = (
  cloudRef: RefObject<AssistantCloud>,
  scopeRef?: RefObject<unknown>,
  ownership?: CloudThreadOwnership,
): RuntimeAdapters => {
  const scope = scopeRef?.current ?? DEFAULT_CLOUD_SCOPE;
  const [committedScopeRef] = useState(() => createCommittedScopeRef(scope));
  const [ownershipState] = useState(() => ({
    required: scope !== DEFAULT_CLOUD_SCOPE,
  }));
  const [committedOwnershipRef] = useState<{
    current: CloudThreadOwnership | undefined;
  }>(() => ({
    current: ownershipState.required ? ownership : undefined,
  }));
  useInsertionEffect(() => {
    if (!Object.is(committedScopeRef.current, scope)) {
      ownershipState.required = true;
    }
    committedOwnershipRef.current = ownershipState.required
      ? ownership
      : undefined;
    committedScopeRef.update(scope);
  }, [
    committedOwnershipRef,
    committedScopeRef,
    ownership,
    ownershipState,
    scope,
  ]);
  const history = useScopedAssistantCloudThreadHistoryAdapter(
    cloudRef,
    committedScopeRef,
    committedOwnershipRef,
  );
  const [attachments] = useState(() =>
    createScopedCloudFileAttachmentAdapter(
      () => cloudRef.current,
      () => committedScopeRef.current,
      (listener) => committedScopeRef.subscribe(listener),
    ),
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
 * `delete` callbacks. Swapping to a different `cloud` instance or `scopeId`
 * requires a new adapter. The consumer must then reload its remote list as
 * required by the `RemoteThreadList` adapter replacement contract. Without a
 * `cloud` instance (and without
 * `NEXT_PUBLIC_ASSISTANT_BASE_URL`), the adapter falls back to an in-memory
 * list. `useCloudThreadListAdapter` wraps this for the React hook signature.
 */
export const createCloudThreadListAdapter = (
  options:
    | CloudThreadListAdapterOptions
    | (() => CloudThreadListAdapterOptions),
): RemoteThreadListAdapter => {
  const getOptions = typeof options === "function" ? options : () => options;
  const initialOptions = getOptions();
  const cloud = initialOptions.cloud ?? autoCloud;
  const scopeId = initialOptions.scopeId;

  if (!cloud) {
    const inMemory = new InMemoryThreadListAdapter();
    inMemory.initialize = async (threadId: string) => {
      const result = await getOptions().create?.();
      return { remoteId: threadId, externalId: result?.externalId };
    };
    return inMemory;
  }

  const ownedRemoteIds = new Set<string>();

  const unstable_useAdapters = function useCloudAdapters(): RuntimeAdapters {
    const cloudRef = { current: cloud };
    const scopeRef = { current: scopeId };
    return useCloudRuntimeAdapters(cloudRef, scopeRef, ownedRemoteIds);
  };

  cloud.registerSdk?.(CORE_SDK);
  const sdk = getOptions().sdk;
  if (sdk) cloud.registerSdk?.(sdk);

  const adapter: RemoteThreadListAdapter = {
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
      for (const thread of threads) ownedRemoteIds.add(thread.id);
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
      ownedRemoteIds.add(remoteId);

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
      const result = await cloud.threads.delete(threadId);
      ownedRemoteIds.delete(threadId);
      return result;
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
      ownedRemoteIds.add(thread.id);
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
  cloudThreadOwnership.set(adapter, ownedRemoteIds);
  return adapter;
};
