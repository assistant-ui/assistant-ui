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
  messagesProjection,
  valuesProjection,
} from "@langchain/langgraph-sdk/stream";
import type { SubagentDiscoverySnapshot } from "@langchain/react";
import {
  attachSubagentTranscripts,
  type AttachMemo,
  createAttachMemo,
} from "./attachSubagentTranscripts";
import { convertLangChainBaseMessage } from "./convertMessages";
import { groupUIMessagesByParent } from "./converter";
import type { LangChainBaseMessage, UIMessage } from "./types";
import { mergeUIMessages } from "./uiMessages";

export const MAX_SUBAGENT_DEPTH = 16;

const TRANSCRIPT_METADATA = {};

type ProjectionStore<T> = {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
};

type ProjectionResource = {
  snapshot: SubagentDiscoverySnapshot;
  namespace: readonly string[];
  store: ProjectionStore<BaseMessage[]>;
  unsubscribe: () => void;
  release: () => void;
  valuesStore: ProjectionStore<unknown>;
  valuesUnsubscribe: () => void;
  valuesRelease: () => void;
  storeSnapshot: BaseMessage[] | undefined;
  status: SubagentDiscoverySnapshot["status"] | undefined;
  uiMessages: readonly UIMessage[];
  converted: readonly ThreadMessage[] | undefined;
  childTranscripts: ReadonlyMap<string, readonly ThreadMessage[]> | undefined;
  transcript: readonly ThreadMessage[] | undefined;
  convert:
    | useExternalMessageConverter.Callback<LangChainBaseMessage>
    | undefined;
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
  messagesKey: string;
  uiStateKey: string;
  uiMessagesByParent: Map<string, UIMessage[]>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ReadonlyMap<string, readonly ThreadMessage[]>;
  reconcile(
    controller: AnyStream[typeof STREAM_CONTROLLER],
    subagents: AnyStream["subagents"],
    uiMessagesByParent: Map<string, UIMessage[]>,
    messagesKey: string,
    uiStateKey: string,
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

const getUIStateValue = (values: unknown, uiStateKey: string): unknown =>
  values !== null && typeof values === "object" && !Array.isArray(values)
    ? (values as Record<string, unknown>)[uiStateKey]
    : undefined;

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
    messagesKey: "messages",
    uiStateKey: "ui",
    uiMessagesByParent,
    subscribe(listener) {
      source.listeners.add(listener);
      return () => source.listeners.delete(listener);
    },
    getSnapshot() {
      return source.snapshot;
    },
    reconcile(
      controller,
      subagents,
      uiMessagesByParent,
      messagesKey,
      uiStateKey,
    ) {
      if (source.uiMessagesByParent !== uiMessagesByParent) {
        source.uiMessagesByParent = uiMessagesByParent;
      }

      if (source.controller !== controller) {
        source.dispose();
        source.controller = controller;
      }

      const messagesKeyChanged = source.messagesKey !== messagesKey;
      source.messagesKey = messagesKey;
      source.uiStateKey = uiStateKey;

      if (messagesKeyChanged) {
        for (const resource of source.resources.values()) {
          resource.valuesUnsubscribe();
          resource.valuesRelease();
          const acquiredValues = controller.registry.acquire(
            valuesProjection(resource.namespace, messagesKey),
          );
          resource.valuesStore = acquiredValues.store;
          resource.valuesRelease = acquiredValues.release;
          resource.valuesUnsubscribe = resource.valuesStore.subscribe(() =>
            rebuild(),
          );
        }
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
          resource.unsubscribe();
          resource.release();
          resource.valuesUnsubscribe();
          resource.valuesRelease();
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
          messagesProjection(snapshot.namespace),
        );
        const acquiredValues = controller.registry.acquire(
          valuesProjection(snapshot.namespace, messagesKey),
        );
        const resource: ProjectionResource = {
          snapshot,
          namespace: snapshot.namespace,
          store: acquired.store,
          unsubscribe: () => {},
          release: acquired.release,
          valuesStore: acquiredValues.store,
          valuesUnsubscribe: () => {},
          valuesRelease: acquiredValues.release,
          storeSnapshot: undefined,
          status: undefined,
          uiMessages: [],
          converted: undefined,
          childTranscripts: undefined,
          transcript: undefined,
          convert: undefined,
          memo: createAttachMemo(),
          cache: createExternalMessageConversionCache(),
        };
        resource.unsubscribe = resource.store.subscribe(() => rebuild());
        resource.valuesUnsubscribe = resource.valuesStore.subscribe(() =>
          rebuild(),
        );
        source.resources.set(snapshot.id, resource);
      }

      rebuild();
    },
    dispose() {
      for (const resource of source.resources.values()) {
        resource.unsubscribe();
        resource.release();
        resource.valuesUnsubscribe();
        resource.valuesRelease();
      }
      source.resources.clear();
      source.namespaceRequests.clear();
      source.snapshot = new Map();
      for (const listener of source.listeners) listener();
    },
  };

  const rebuild = () => {
    const { uiMessagesByParent } = source;
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
      const uiMessages = mergeUIMessages(
        collectUIMessages(storeSnapshot, uiMessagesByParent),
        getUIStateValue(resource.valuesStore.getSnapshot(), source.uiStateKey),
      );
      const uiMessagesChanged = !sameUIMessages(
        resource.uiMessages,
        uiMessages,
      );

      const conversionChanged =
        resource.converted === undefined ||
        resource.storeSnapshot !== storeSnapshot ||
        resource.status !== status ||
        uiMessagesChanged;
      if (conversionChanged) {
        if (resource.convert === undefined || uiMessagesChanged) {
          resource.convert = convertWithUIMessages(
            groupUIMessagesByParent(uiMessages),
          );
        }
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
  messagesKey = "messages",
  uiStateKey = "ui",
): ReadonlyMap<string, readonly ThreadMessage[]> => {
  const sourceRef = useRef<SubagentTranscriptSource | undefined>(undefined);
  if (!sourceRef.current) {
    sourceRef.current = createSubagentTranscriptSource();
  }
  const source = sourceRef.current;
  const controller = stream[STREAM_CONTROLLER];

  useEffect(() => {
    source.reconcile(
      controller,
      stream.subagents,
      uiMessagesByParent,
      messagesKey,
      uiStateKey,
    );
  }, [
    controller,
    messagesKey,
    source,
    stream.subagents,
    uiMessagesByParent,
    uiStateKey,
  ]);

  useEffect(() => () => source.dispose(), [source]);

  return useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getSnapshot,
  );
};
