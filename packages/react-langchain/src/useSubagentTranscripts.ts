"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  convertExternalMessages,
  type useExternalMessageConverter,
} from "@assistant-ui/core/react";
import { STREAM_CONTROLLER, type AnyStream } from "@langchain/react";
import type { BaseMessage } from "@langchain/core/messages";
import { messagesProjection } from "@langchain/langgraph-sdk/stream";
import type { SubagentDiscoverySnapshot } from "@langchain/react";
import type { LangChainBaseMessage } from "./types";

const MAX_SUBAGENT_DEPTH = 16;

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
  childTranscripts: ReadonlyMap<string, readonly ThreadMessage[]> | undefined;
  transcript: readonly ThreadMessage[] | undefined;
};

type UseSubagentTranscriptsOptions = {
  metadata?: useExternalMessageConverter.Metadata;
};

type SubagentTranscriptSource = {
  resources: Map<string, ProjectionResource>;
  snapshot: ReadonlyMap<string, readonly ThreadMessage[]>;
  listeners: Set<() => void>;
  controller: AnyStream[typeof STREAM_CONTROLLER] | undefined;
  convert: useExternalMessageConverter.Callback<LangChainBaseMessage>;
  metadata: useExternalMessageConverter.Metadata;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ReadonlyMap<string, readonly ThreadMessage[]>;
  reconcile(
    controller: AnyStream[typeof STREAM_CONTROLLER],
    subagents: AnyStream["subagents"],
    convert: useExternalMessageConverter.Callback<LangChainBaseMessage>,
    metadata: useExternalMessageConverter.Metadata,
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

const createSubagentTranscriptSource = (
  convert: useExternalMessageConverter.Callback<LangChainBaseMessage>,
  metadata: useExternalMessageConverter.Metadata,
): SubagentTranscriptSource => {
  const source: SubagentTranscriptSource = {
    resources: new Map(),
    snapshot: new Map(),
    listeners: new Set(),
    controller: undefined,
    convert,
    metadata,
    subscribe(listener) {
      source.listeners.add(listener);
      return () => source.listeners.delete(listener);
    },
    getSnapshot() {
      return source.snapshot;
    },
    reconcile(controller, subagents, nextConvert, nextMetadata) {
      source.convert = nextConvert;
      source.metadata = nextMetadata;

      if (source.controller !== controller) {
        source.dispose();
        source.controller = controller;
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
        void controller.resolveSubagentNamespace(snapshot.id).catch(() => {});
        if (snapshot.depth > MAX_SUBAGENT_DEPTH) continue;
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
          childTranscripts: undefined,
          transcript: undefined,
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
      source.snapshot = new Map();
      for (const listener of source.listeners) listener();
    },
  };

  const rebuild = () => {
    const resources = [...source.resources.values()].sort(
      (a, b) => b.snapshot.depth - a.snapshot.depth,
    );
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

    for (const resource of resources) {
      const childTranscripts = new Map(
        (childrenByParent.get(resource.snapshot.id) ?? []).map((child) => [
          child.snapshot.id,
          child.transcript!,
        ]),
      );
      const storeSnapshot = resource.store.getSnapshot();
      const status = resource.snapshot.status;

      if (
        resource.transcript === undefined ||
        resource.storeSnapshot !== storeSnapshot ||
        resource.status !== status ||
        !sameTranscriptEntries(resource.childTranscripts, childTranscripts)
      ) {
        resource.transcript = convertExternalMessages(
          storeSnapshot as LangChainBaseMessage[],
          source.convert,
          status === "running",
          {
            ...source.metadata,
            subagentTranscripts: childTranscripts,
          } as useExternalMessageConverter.Metadata,
        );
        resource.storeSnapshot = storeSnapshot;
        resource.status = status;
        resource.childTranscripts = childTranscripts;
        changed = true;
      }

      if (!source.snapshot.has(resource.snapshot.id)) changed = true;
      transcripts.set(resource.snapshot.id, resource.transcript);
    }

    if (!changed) return;
    source.snapshot = transcripts;
    for (const listener of source.listeners) listener();
  };

  return source;
};

export const useSubagentTranscripts = (
  stream: AnyStream,
  convert: useExternalMessageConverter.Callback<LangChainBaseMessage>,
  options: UseSubagentTranscriptsOptions,
): ReadonlyMap<string, readonly ThreadMessage[]> => {
  const sourceRef = useRef<SubagentTranscriptSource | undefined>(undefined);
  if (!sourceRef.current) {
    sourceRef.current = createSubagentTranscriptSource(
      convert,
      options.metadata ?? {},
    );
  }
  const source = sourceRef.current;
  const controller = stream[STREAM_CONTROLLER];

  useEffect(() => {
    source.reconcile(
      controller,
      stream.subagents,
      convert,
      options.metadata ?? {},
    );
  }, [controller, convert, options.metadata, source, stream.subagents]);

  useEffect(() => () => source.dispose(), [source]);

  return useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getSnapshot,
  );
};
