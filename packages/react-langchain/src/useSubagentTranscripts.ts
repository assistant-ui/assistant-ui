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
import { messagesProjection } from "@langchain/langgraph-sdk/stream";
import type { SubagentDiscoverySnapshot } from "@langchain/react";
import {
  attachSubagentTranscripts,
  type AttachMemo,
  createAttachMemo,
} from "./attachSubagentTranscripts";
import { convertLangChainBaseMessage } from "./convertMessages";
import type { LangChainBaseMessage, UIMessage } from "./types";

export const MAX_SUBAGENT_DEPTH = 16;

const TRANSCRIPT_METADATA = {};

type ProjectionStore = {
  getSnapshot(): BaseMessage[];
  subscribe(listener: () => void): () => void;
};

type ProjectionResource = {
  snapshot: SubagentDiscoverySnapshot;
  namespace: readonly string[];
  store: ProjectionStore;
  unsubscribe: () => void;
  release: () => void;
  storeSnapshot: BaseMessage[] | undefined;
  status: SubagentDiscoverySnapshot["status"] | undefined;
  uiMessages: readonly UIMessage[];
  converted: readonly ThreadMessage[] | undefined;
  childTranscripts: ReadonlyMap<string, readonly ThreadMessage[]> | undefined;
  transcript: readonly ThreadMessage[] | undefined;
  memo: AttachMemo;
  cache: ExternalMessageConversionCache;
};

type SubagentTranscriptSource = {
  resources: Map<string, ProjectionResource>;
  requestedNamespaceIds: Set<string>;
  snapshot: ReadonlyMap<string, readonly ThreadMessage[]>;
  listeners: Set<() => void>;
  controller: AnyStream[typeof STREAM_CONTROLLER] | undefined;
  uiMessagesByParent: Map<string, UIMessage[]>;
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

const createSubagentTranscriptSource = (): SubagentTranscriptSource => {
  const source: SubagentTranscriptSource = {
    resources: new Map(),
    requestedNamespaceIds: new Set(),
    snapshot: new Map(),
    listeners: new Set(),
    controller: undefined,
    uiMessagesByParent: new Map(),
    subscribe(listener) {
      source.listeners.add(listener);
      return () => source.listeners.delete(listener);
    },
    getSnapshot() {
      return source.snapshot;
    },
    reconcile(controller, subagents, uiMessagesByParent) {
      source.uiMessagesByParent = uiMessagesByParent;

      if (source.controller !== controller) {
        source.dispose();
        source.controller = controller;
      }

      for (const id of source.requestedNamespaceIds) {
        if (!subagents.has(id)) source.requestedNamespaceIds.delete(id);
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
          source.resources.delete(id);
          continue;
        }
        resource.snapshot = snapshot;
      }

      for (const snapshot of subagents.values()) {
        if (snapshot.depth > MAX_SUBAGENT_DEPTH) continue;
        if (!source.requestedNamespaceIds.has(snapshot.id)) {
          source.requestedNamespaceIds.add(snapshot.id);
          void controller.resolveSubagentNamespace(snapshot.id).catch(() => {
            if (source.controller === controller)
              source.requestedNamespaceIds.delete(snapshot.id);
          });
        }
        if (source.resources.has(snapshot.id)) continue;
        const acquired = controller.registry.acquire(
          messagesProjection(snapshot.namespace),
        );
        const resource: ProjectionResource = {
          snapshot,
          namespace: snapshot.namespace,
          store: acquired.store,
          unsubscribe: () => {},
          release: acquired.release,
          storeSnapshot: undefined,
          status: undefined,
          uiMessages: [],
          converted: undefined,
          childTranscripts: undefined,
          transcript: undefined,
          memo: createAttachMemo(),
          cache: createExternalMessageConversionCache(),
        };
        resource.unsubscribe = resource.store.subscribe(() => rebuild());
        source.resources.set(snapshot.id, resource);
      }

      rebuild();
    },
    dispose() {
      for (const resource of source.resources.values()) {
        resource.unsubscribe();
        resource.release();
      }
      source.resources.clear();
      source.requestedNamespaceIds.clear();
      source.snapshot = new Map();
      for (const listener of source.listeners) listener();
    },
  };

  const rebuild = () => {
    const { uiMessagesByParent } = source;
    const convert: useExternalMessageConverter.Callback<
      LangChainBaseMessage
    > = (message, metadata) =>
      convertLangChainBaseMessage(message, { ...metadata, uiMessagesByParent });
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
      const uiMessages = collectUIMessages(storeSnapshot, uiMessagesByParent);

      const conversionChanged =
        resource.converted === undefined ||
        resource.storeSnapshot !== storeSnapshot ||
        resource.status !== status ||
        !sameUIMessages(resource.uiMessages, uiMessages);
      if (conversionChanged) {
        resource.converted = convertExternalMessages(
          storeSnapshot as LangChainBaseMessage[],
          convert,
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
