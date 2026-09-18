"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  convertExternalMessages,
  createExternalMessageConversionCache,
  type ExternalMessageConversionCache,
  type useExternalMessageConverter,
} from "@assistant-ui/core/react";
import { STREAM_CONTROLLER, type AnyStream } from "@langchain/react";
import type { BaseMessage } from "@langchain/core/messages";
import {
  channelProjection,
  messagesProjection,
  type Event,
} from "@langchain/langgraph-sdk/stream";
import type { ThreadStream } from "@langchain/langgraph-sdk/client";
import type { SubagentDiscoverySnapshot } from "@langchain/react";
import {
  attachSubagentTranscripts,
  type AttachMemo,
  createAttachMemo,
} from "./attachSubagentTranscripts";
import { convertLangChainBaseMessage } from "./convertMessages";
import { groupUIMessagesByParent } from "./converter";
import type { LangChainBaseMessage, UIMessage } from "./types";
import {
  createUIFoldMemo,
  foldUIUpdates,
  mergeUIMessages,
  UI_CUSTOM_CHANNELS,
  type UIFoldMemo,
} from "./uiMessages";

export const MAX_SUBAGENT_DEPTH = 16;

const ROOT_UI_CHANNEL_DEPTH = 1;

const TRANSCRIPT_METADATA = {};

const NO_UI_MESSAGES: readonly UIMessage[] = [];

type ProjectionStore<T> = {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
};

type ProjectionResource = {
  snapshot: SubagentDiscoverySnapshot;
  namespace: readonly string[];
  store: ProjectionStore<BaseMessage[]>;
  uiStore: ProjectionStore<readonly Event[]> | undefined;
  dispose: () => void;
  storeSnapshot: BaseMessage[] | undefined;
  status: SubagentDiscoverySnapshot["status"] | undefined;
  uiFoldMemo: UIFoldMemo;
  localUiMessages: readonly UIMessage[] | undefined;
  rootUiMessagesByParent: Map<string, UIMessage[]> | undefined;
  uiMessagesByParent: Map<string, UIMessage[]>;
  convert: useExternalMessageConverter.Callback<LangChainBaseMessage>;
  uiMessages: readonly UIMessage[];
  converted: readonly ThreadMessage[] | undefined;
  childTranscripts: ReadonlyMap<string, readonly ThreadMessage[]> | undefined;
  transcript: readonly ThreadMessage[] | undefined;
  memo: AttachMemo;
  cache: ExternalMessageConversionCache;
};

type NamespaceRequest = {
  id: string;
  attempts: number;
  pending: boolean;
  retryQueued: boolean;
  status: SubagentDiscoverySnapshot["status"];
};

type SubagentTranscriptSource = {
  resources: Map<string, ProjectionResource>;
  namespaceRequests: Map<string, NamespaceRequest>;
  snapshot: ReadonlyMap<string, readonly ThreadMessage[]>;
  listeners: Set<() => void>;
  controller: AnyStream[typeof STREAM_CONTROLLER] | undefined;
  uiMessagesByParent: Map<string, UIMessage[]>;
  convert: useExternalMessageConverter.Callback<LangChainBaseMessage>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ReadonlyMap<string, readonly ThreadMessage[]>;
  reconcile(
    controller: AnyStream[typeof STREAM_CONTROLLER],
    subagents: AnyStream["subagents"],
    uiMessagesByParent: Map<string, UIMessage[]>,
  ): void;
  dispose(): void;
};

const sameNamespace = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);

const needsNamespaceResolution = (snapshot: SubagentDiscoverySnapshot) =>
  snapshot.namespace.length === 1 &&
  snapshot.namespace[0] === `tools:${snapshot.id}`;

const requestSubagentNamespace = (
  source: SubagentTranscriptSource,
  controller: AnyStream[typeof STREAM_CONTROLLER],
  request: NamespaceRequest,
) => {
  request.attempts += 1;
  request.pending = true;
  request.retryQueued = false;
  void controller
    .resolveSubagentNamespace(request.id)
    .catch(() => {})
    .finally(() => {
      if (
        source.controller !== controller ||
        source.namespaceRequests.get(request.id) !== request
      )
        return;

      request.pending = false;
      if (
        !request.retryQueued &&
        request.attempts === 1 &&
        request.status !== "running"
      ) {
        request.retryQueued = true;
      }
      if (!request.retryQueued || request.attempts >= 2) {
        request.retryQueued = false;
        return;
      }
      requestSubagentNamespace(source, controller, request);
    });
};

const sameTranscriptEntries = (
  a: ReadonlyMap<string, readonly ThreadMessage[]> | undefined,
  b: ReadonlyMap<string, readonly ThreadMessage[]>,
) =>
  a?.size === b.size &&
  [...b].every(([id, transcript]) => a.get(id) === transcript);

const collectUIMessages = (
  messages: readonly BaseMessage[],
  uiMessagesByParent: Map<string, UIMessage[]>,
) => {
  const collected: UIMessage[] = [];
  if (uiMessagesByParent.size === 0) return collected;
  for (const message of messages) {
    const uiMessages = message.id && uiMessagesByParent.get(message.id);
    if (uiMessages) collected.push(...uiMessages);
  }
  return collected;
};

const sameUIMessages = (a: readonly UIMessage[], b: readonly UIMessage[]) =>
  a.length === b.length && a.every((ui, index) => ui === b[index]);

const foldLocalUIMessages = (resource: ProjectionResource) => {
  const events = resource.uiStore?.getSnapshot();
  if (events === undefined) return NO_UI_MESSAGES;
  return foldUIUpdates(events, resource.uiFoldMemo);
};

const mergeLocalUIMessages = (
  uiMessagesByParent: Map<string, UIMessage[]>,
  localUiMessages: readonly UIMessage[],
) => {
  const merged = new Map(uiMessagesByParent);
  for (const [parentId, messages] of groupUIMessagesByParent<UIMessage>(
    localUiMessages,
  )) {
    merged.set(parentId, mergeUIMessages(messages, merged.get(parentId)));
  }
  return merged;
};

const exactNamespaceMessagesProjection = (namespace: readonly string[]) => {
  const projection = messagesProjection(namespace);
  return {
    ...projection,
    key: `${projection.key}|depth=0`,
    open(params: Parameters<typeof projection.open>[0]) {
      const { thread } = params;
      return projection.open({
        ...params,
        thread: {
          subscribe: (
            subscribeParams: Parameters<ThreadStream["subscribe"]>[0],
          ) => thread.subscribe({ ...subscribeParams, depth: 0 }),
        } as ThreadStream,
      });
    },
  };
};

const convertWithUIMessages =
  (
    uiMessagesByParent: Map<string, UIMessage[]>,
  ): useExternalMessageConverter.Callback<LangChainBaseMessage> =>
  (message, metadata) =>
    convertLangChainBaseMessage(message, { ...metadata, uiMessagesByParent });

const createSubagentTranscriptSource = (): SubagentTranscriptSource => {
  const uiMessagesByParent = new Map<string, UIMessage[]>();
  const source: SubagentTranscriptSource = {
    resources: new Map(),
    namespaceRequests: new Map(),
    snapshot: new Map(),
    listeners: new Set(),
    controller: undefined,
    uiMessagesByParent,
    convert: convertWithUIMessages(uiMessagesByParent),
    subscribe(listener) {
      source.listeners.add(listener);
      return () => source.listeners.delete(listener);
    },
    getSnapshot() {
      return source.snapshot;
    },
    reconcile(controller, subagents, uiMessagesByParent) {
      if (source.uiMessagesByParent !== uiMessagesByParent) {
        source.uiMessagesByParent = uiMessagesByParent;
        source.convert = convertWithUIMessages(uiMessagesByParent);
      }

      if (source.controller !== controller) {
        source.dispose();
        source.controller = controller;
      }

      for (const id of source.namespaceRequests.keys()) {
        if (!subagents.has(id)) source.namespaceRequests.delete(id);
      }

      for (const [id, resource] of source.resources) {
        const snapshot = subagents.get(id);
        if (
          !snapshot ||
          snapshot.depth > MAX_SUBAGENT_DEPTH ||
          !sameNamespace(resource.namespace, snapshot.namespace)
        ) {
          resource.dispose();
          source.resources.delete(id);
          continue;
        }
        resource.snapshot = snapshot;
      }

      for (const snapshot of subagents.values()) {
        if (snapshot.depth > MAX_SUBAGENT_DEPTH) continue;
        if (!needsNamespaceResolution(snapshot)) {
          source.namespaceRequests.delete(snapshot.id);
        } else {
          const request = source.namespaceRequests.get(snapshot.id);
          if (!request) {
            const nextRequest: NamespaceRequest = {
              id: snapshot.id,
              attempts: 0,
              pending: false,
              retryQueued: false,
              status: snapshot.status,
            };
            source.namespaceRequests.set(snapshot.id, nextRequest);
            requestSubagentNamespace(source, controller, nextRequest);
          } else if (request.status !== snapshot.status) {
            request.status = snapshot.status;
            if (request.pending) {
              request.retryQueued = request.attempts < 2;
            } else if (request.attempts < 2) {
              requestSubagentNamespace(source, controller, request);
            }
          }
        }
        if (source.resources.has(snapshot.id)) continue;
        const acquired = controller.registry.acquire(
          exactNamespaceMessagesProjection(snapshot.namespace),
        );
        const acquiredUI =
          snapshot.namespace.length > ROOT_UI_CHANNEL_DEPTH
            ? controller.registry.acquire(
                channelProjection(UI_CUSTOM_CHANNELS, snapshot.namespace),
              )
            : undefined;
        const resource: ProjectionResource = {
          snapshot,
          namespace: snapshot.namespace,
          store: acquired.store,
          uiStore: acquiredUI?.store,
          dispose: () => {},
          storeSnapshot: undefined,
          status: undefined,
          uiFoldMemo: createUIFoldMemo(),
          localUiMessages: undefined,
          rootUiMessagesByParent: undefined,
          uiMessagesByParent: source.uiMessagesByParent,
          convert: source.convert,
          uiMessages: [],
          converted: undefined,
          childTranscripts: undefined,
          transcript: undefined,
          memo: createAttachMemo(),
          cache: createExternalMessageConversionCache(),
        };
        const unsubscribe = resource.store.subscribe(() => rebuild());
        const unsubscribeUI = resource.uiStore?.subscribe(() => rebuild());
        resource.dispose = () => {
          unsubscribe();
          unsubscribeUI?.();
          acquired.release();
          acquiredUI?.release();
        };
        source.resources.set(snapshot.id, resource);
      }

      rebuild();
    },
    dispose() {
      for (const resource of source.resources.values()) resource.dispose();
      source.resources.clear();
      source.namespaceRequests.clear();
      source.snapshot = new Map();
      for (const listener of source.listeners) listener();
    },
  };

  const rebuild = () => {
    const { convert, uiMessagesByParent } = source;
    const resources = [...source.resources.values()];
    const childrenByParent = new Map<string, ProjectionResource[]>();

    for (const resource of resources) {
      const parentId = resource.snapshot.parentId;
      if (parentId == null) continue;
      const children = childrenByParent.get(parentId);
      if (children) children.push(resource);
      else childrenByParent.set(parentId, [resource]);
    }

    const transcripts = new Map<string, readonly ThreadMessage[]>();
    let changed = source.snapshot.size !== resources.length;
    const built = new Set<string>();

    const build = (resource: ProjectionResource, depth: number) => {
      if (built.has(resource.snapshot.id)) return;
      built.add(resource.snapshot.id);
      const children =
        depth < MAX_SUBAGENT_DEPTH
          ? (childrenByParent.get(resource.snapshot.id) ?? [])
          : [];
      for (const child of children) build(child, depth + 1);
      const childTranscripts = new Map(
        children.flatMap((child) =>
          child.transcript
            ? [[child.snapshot.id, child.transcript] as const]
            : [],
        ),
      );
      const storeSnapshot = resource.store.getSnapshot();
      const status = resource.snapshot.status;
      const localUiMessages = foldLocalUIMessages(resource);
      if (
        resource.localUiMessages !== localUiMessages ||
        resource.rootUiMessagesByParent !== uiMessagesByParent
      ) {
        resource.localUiMessages = localUiMessages;
        resource.rootUiMessagesByParent = uiMessagesByParent;
        resource.uiMessagesByParent =
          localUiMessages.length === 0
            ? uiMessagesByParent
            : mergeLocalUIMessages(uiMessagesByParent, localUiMessages);
        resource.convert =
          resource.uiMessagesByParent === uiMessagesByParent
            ? convert
            : convertWithUIMessages(resource.uiMessagesByParent);
      }
      const uiMessages = collectUIMessages(
        storeSnapshot,
        resource.uiMessagesByParent,
      );

      const conversionChanged =
        resource.converted === undefined ||
        resource.storeSnapshot !== storeSnapshot ||
        resource.status !== status ||
        !sameUIMessages(resource.uiMessages, uiMessages);
      if (conversionChanged) {
        resource.converted = convertExternalMessages(
          storeSnapshot as LangChainBaseMessage[],
          resource.convert,
          status === "running",
          TRANSCRIPT_METADATA,
          resource.cache,
        );
        resource.storeSnapshot = storeSnapshot;
        resource.status = status;
        resource.uiMessages = uiMessages;
      }

      if (
        resource.transcript === undefined ||
        conversionChanged ||
        !sameTranscriptEntries(resource.childTranscripts, childTranscripts)
      ) {
        const transcript = attachSubagentTranscripts(
          resource.converted!,
          childTranscripts,
          resource.memo,
        );
        changed ||= resource.transcript !== transcript;
        resource.transcript = transcript;
        resource.childTranscripts = childTranscripts;
      }

      if (!source.snapshot.has(resource.snapshot.id)) changed = true;
      transcripts.set(resource.snapshot.id, resource.transcript);
    };

    for (const resource of resources) {
      if (
        resource.snapshot.parentId == null ||
        !source.resources.has(resource.snapshot.parentId)
      )
        build(resource, 1);
    }
    for (const resource of resources) build(resource, MAX_SUBAGENT_DEPTH);

    if (!changed) return;
    source.snapshot = transcripts;
    for (const listener of source.listeners) listener();
  };

  return source;
};

export const useSubagentTranscripts = (
  stream: AnyStream,
  uiMessagesByParent: Map<string, UIMessage[]>,
): ReadonlyMap<string, readonly ThreadMessage[]> => {
  const sourceRef = useRef<SubagentTranscriptSource | undefined>(undefined);
  if (!sourceRef.current) {
    sourceRef.current = createSubagentTranscriptSource();
  }
  const source = sourceRef.current;
  const controller = stream[STREAM_CONTROLLER];

  useEffect(() => {
    source.reconcile(controller, stream.subagents, uiMessagesByParent);
  }, [controller, source, stream.subagents, uiMessagesByParent]);

  useEffect(() => () => source.dispose(), [source]);

  return useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getSnapshot,
  );
};
