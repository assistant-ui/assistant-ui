"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  stepStreamingTiming,
  type MessageTiming,
  type StreamingTimingState,
  type ThreadMessage,
  type ToolCallTiming,
} from "@assistant-ui/core";
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
import type { SubagentDiscoverySnapshot } from "@langchain/react";
import {
  attachSubagentTranscripts,
  type AttachMemo,
  createAttachMemo,
  type SubagentTranscript,
} from "./attachSubagentTranscripts";
import { convertLangChainBaseMessage } from "./convertMessages";
import { groupUIMessagesByParent } from "./converter";
import { langChainStreamingTimingAccessors } from "./streamingTiming";
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

const NO_MESSAGE_TIMING: Record<string, MessageTiming> = {};

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
  localUiMessages: readonly UIMessage[];
  rootUiMessagesByParent: Map<string, UIMessage[]>;
  uiMessagesByParent: Map<string, UIMessage[]>;
  timingState: StreamingTimingState | null;
  messageTiming: Record<string, MessageTiming>;
  convertedMessageTiming: Record<string, MessageTiming> | undefined;
  convert: useExternalMessageConverter.Callback<LangChainBaseMessage>;
  uiMessages: readonly UIMessage[];
  converted: readonly ThreadMessage[] | undefined;
  childTranscripts: ReadonlyMap<string, SubagentTranscript> | undefined;
  transcript: readonly ThreadMessage[] | undefined;
  timing: ToolCallTiming | undefined;
  entry: SubagentTranscript | undefined;
  memo: AttachMemo;
  cache: ExternalMessageConversionCache;
};

type MeasuredTiming = {
  timing: ToolCallTiming | undefined;
  timingState: StreamingTimingState | null;
  messageTiming: Record<string, MessageTiming>;
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
  snapshot: ReadonlyMap<string, SubagentTranscript>;
  listeners: Set<() => void>;
  controller: AnyStream[typeof STREAM_CONTROLLER] | undefined;
  uiMessagesByParent: Map<string, UIMessage[]>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ReadonlyMap<string, SubagentTranscript>;
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
  a: ReadonlyMap<string, SubagentTranscript> | undefined,
  b: ReadonlyMap<string, SubagentTranscript>,
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

const createConverter =
  (
    uiMessagesByParent: Map<string, UIMessage[]>,
    messageTiming: Record<string, MessageTiming>,
  ): useExternalMessageConverter.Callback<LangChainBaseMessage> =>
  (message, metadata) =>
    convertLangChainBaseMessage(message, {
      ...metadata,
      uiMessagesByParent,
      messageTiming,
    });

/**
 * Wall clock for a task the client watched run. Discovery stamps
 * `startedAt` and `completedAt` when it first sees the call and its result,
 * so a subagent first seen in a terminal status was seeded from a checkpoint
 * and carries no duration at all rather than a zero one.
 */
const updateTiming = (resource: ProjectionResource) => {
  if (resource.timing === undefined) return;
  const startedAt = resource.snapshot.startedAt.getTime();
  const completedAt = resource.snapshot.completedAt?.getTime();
  if (
    resource.timing.startedAt === startedAt &&
    resource.timing.completedAt === completedAt
  )
    return;
  resource.timing = {
    startedAt,
    ...(completedAt !== undefined && { completedAt }),
  };
};

const createSubagentTranscriptSource = (): SubagentTranscriptSource => {
  const uiMessagesByParent = new Map<string, UIMessage[]>();
  const source: SubagentTranscriptSource = {
    resources: new Map(),
    namespaceRequests: new Map(),
    snapshot: new Map(),
    listeners: new Set(),
    controller: undefined,
    uiMessagesByParent,
    subscribe(listener) {
      source.listeners.add(listener);
      return () => source.listeners.delete(listener);
    },
    getSnapshot() {
      return source.snapshot;
    },
    reconcile(controller, subagents, uiMessagesByParent) {
      source.uiMessagesByParent = uiMessagesByParent;
      // A resource is rebuilt from scratch when its namespace resolves, which
      // routinely happens after the subagent finished. Its timing was measured
      // while the client watched the task run and cannot be measured again.
      const rebound = new Map<string, MeasuredTiming>();

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
          if (snapshot && snapshot.depth <= MAX_SUBAGENT_DEPTH)
            rebound.set(id, {
              timing: resource.timing,
              timingState: resource.timingState,
              messageTiming: resource.messageTiming,
            });
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
          messagesProjection(snapshot.namespace),
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
          localUiMessages: NO_UI_MESSAGES,
          rootUiMessagesByParent: source.uiMessagesByParent,
          uiMessagesByParent: source.uiMessagesByParent,
          timingState: rebound.get(snapshot.id)?.timingState ?? null,
          messageTiming:
            rebound.get(snapshot.id)?.messageTiming ?? NO_MESSAGE_TIMING,
          convertedMessageTiming: undefined,
          convert: createConverter(
            source.uiMessagesByParent,
            NO_MESSAGE_TIMING,
          ),
          uiMessages: [],
          converted: undefined,
          childTranscripts: undefined,
          transcript: undefined,
          timing: rebound.has(snapshot.id)
            ? rebound.get(snapshot.id)!.timing
            : snapshot.status === "running"
              ? { startedAt: snapshot.startedAt.getTime() }
              : undefined,
          entry: undefined,
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

    const transcripts = new Map<string, SubagentTranscript>();
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
          child.entry ? [[child.snapshot.id, child.entry] as const] : [],
        ),
      );
      const storeSnapshot = resource.store.getSnapshot();
      const status = resource.snapshot.status;
      const stepped = stepStreamingTiming(
        resource.timingState,
        storeSnapshot as LangChainBaseMessage[],
        status === "running",
        langChainStreamingTimingAccessors,
        undefined,
      );
      resource.timingState = stepped.state;
      if (Object.keys(stepped.timings).length > 0) {
        resource.messageTiming = {
          ...resource.messageTiming,
          ...stepped.timings,
        };
      }
      const localUiMessages = foldLocalUIMessages(resource);
      if (
        resource.localUiMessages !== localUiMessages ||
        resource.rootUiMessagesByParent !== uiMessagesByParent ||
        resource.convertedMessageTiming !== resource.messageTiming
      ) {
        resource.localUiMessages = localUiMessages;
        resource.rootUiMessagesByParent = uiMessagesByParent;
        resource.uiMessagesByParent =
          localUiMessages.length === 0
            ? uiMessagesByParent
            : mergeLocalUIMessages(uiMessagesByParent, localUiMessages);
        resource.convert = createConverter(
          resource.uiMessagesByParent,
          resource.messageTiming,
        );
      }
      const uiMessages = collectUIMessages(
        storeSnapshot,
        resource.uiMessagesByParent,
      );

      const conversionChanged =
        resource.converted === undefined ||
        resource.storeSnapshot !== storeSnapshot ||
        resource.status !== status ||
        resource.convertedMessageTiming !== resource.messageTiming ||
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
        resource.convertedMessageTiming = resource.messageTiming;
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

      updateTiming(resource);
      if (
        resource.entry === undefined ||
        resource.entry.messages !== resource.transcript ||
        resource.entry.timing !== resource.timing
      ) {
        resource.entry = {
          messages: resource.transcript!,
          ...(resource.timing && { timing: resource.timing }),
        };
        changed = true;
      }

      if (!source.snapshot.has(resource.snapshot.id)) changed = true;
      transcripts.set(resource.snapshot.id, resource.entry);
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
): ReadonlyMap<string, SubagentTranscript> => {
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
