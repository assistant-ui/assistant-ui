import type { AppendMessage, ThreadUserMessagePart } from "@assistant-ui/react";
import type {
  OpencodeClient,
  PermissionRequest,
  QuestionRequest,
  SessionStatus,
} from "@opencode-ai/sdk/v2/client";
import {
  copyMessagesById,
  createOpenCodeThreadState,
  reduceOpenCodeThreadStateInternal,
  isOpenCodeStateRunning,
} from "./openCodeThreadState";
import type {
  MessageWithParts,
  OpenCodePermissionRequest,
  OpenCodePermissionResponse,
  OpenCodeQuestionRequest,
  Part,
  QuestionAnswer,
  OpenCodeServerEvent,
  OpenCodeStateEvent,
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
  OpenCodeUnhandledEvent,
  OpenCodeUserMessageOptions,
  PendingUserMessage,
} from "./types";
import {
  STREAM_RECONNECTED_EVENT_TYPE,
  type OpenCodeEventSource,
} from "./OpenCodeEventSource";
import { generateId } from "@assistant-ui/core";
import {
  nullProtoRecord,
  resolveFileMediaType,
  resolveImageMediaType,
  toMediaWireUrl,
} from "@assistant-ui/core/internal";
import { OPEN_CODE_REQUEST_OPTIONS } from "./openCodeRequestOptions";
import { serializeOpenCodeParts } from "./serializeUserParts";
import { getOpenCodeTaskSessionId } from "./openCodeTaskSession";

type OpenCodeEventSourceProvider = () => Pick<OpenCodeEventSource, "subscribe">;

type ChildControllerEntry = {
  controller: OpenCodeThreadController;
  unsubscribe: (() => void) | null;
};

type InteractionRecoveryEntry = {
  asked?: OpenCodeServerEvent;
  settled?: OpenCodeServerEvent;
};

type InteractionRecoveryEvents = {
  permissions: Map<string, Map<string, InteractionRecoveryEntry>>;
  questions: Map<string, Map<string, InteractionRecoveryEntry>>;
};

const createInteractionRecoveryEvents = (): InteractionRecoveryEvents => ({
  permissions: new Map(),
  questions: new Map(),
});

const getTextContent = (parts: readonly ThreadUserMessagePart[]) =>
  serializeOpenCodeParts(parts).trim();

// The attachment carries a name and content type its parts do not, so they
// ride along rather than being dropped at the flatten. Both the outbound
// prompt and the pending copy read this, so their fingerprints agree.
const flattenMessageParts = (message: AppendMessage) => [
  ...message.content,
  ...(message.attachments?.flatMap((attachment: any) =>
    (attachment.content ?? []).map((part: any) => ({
      ...part,
      ...(attachment.name != null && {
        filename: part.filename ?? attachment.name,
      }),
      ...(attachment.contentType != null && {
        contentType: attachment.contentType,
      }),
    })),
  ) ?? []),
];

const getPromptParts = (message: AppendMessage) => {
  const content = flattenMessageParts(message);

  const promptParts: Array<Record<string, unknown>> = [];
  for (const part of content) {
    if (part.type === "text") {
      promptParts.push({ type: "text", text: part.text });
      continue;
    }

    if (part.type === "image") {
      // OpenCode has no image part: its input union is text, file, agent and
      // subtask, so an `image` part never reached the model.
      const mime = resolveImageMediaType(
        part.image,
        (part as { contentType?: string }).contentType,
      );
      promptParts.push({
        type: "file",
        ...(part.filename != null && { filename: part.filename }),
        mime,
        url: toMediaWireUrl(part.image, mime),
      });
      continue;
    }

    if (part.type === "file") {
      const fileMime = resolveFileMediaType(part.data, part.mimeType);
      promptParts.push({
        type: "file",
        filename: part.filename,
        mime: fileMime,
        // An `id` reference is an opaque handle this adapter cannot send, left
        // unwrapped so it fails loudly rather than shipping a corrupt payload.
        url:
          part.sourceType === "id"
            ? part.data
            : toMediaWireUrl(part.data, fileMime),
      });
    }
  }

  return promptParts;
};

const getRecordValue = (
  record: Record<string, unknown>,
  keys: readonly string[],
) => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toPermissionRequest = (
  value: unknown,
): OpenCodePermissionRequest | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.sessionID !== "string" ||
    typeof value.permission !== "string"
  ) {
    return null;
  }

  const metadata = isRecord(value.metadata) ? value.metadata : {};

  const titleValue = getRecordValue(metadata, ["title", "message", "prompt"]);
  const toolNameValue = getRecordValue(metadata, [
    "toolName",
    "tool",
    "name",
    "permission",
  ]);
  const toolInputValue = getRecordValue(metadata, [
    "toolInput",
    "input",
    "args",
    "arguments",
  ]);

  const request = value as PermissionRequest;
  return {
    id: request.id,
    sessionId: request.sessionID,
    permission: request.permission,
    patterns: Array.isArray(request.patterns) ? request.patterns : [],
    metadata,
    always: Array.isArray(request.always) ? request.always : [],
    tool: request.tool,
    toolName:
      typeof toolNameValue === "string" ? toolNameValue : request.permission,
    toolInput: toolInputValue,
    title: typeof titleValue === "string" ? titleValue : undefined,
    askedAt: Date.now(),
    raw: request,
  };
};

const extractPermissionRequest = (
  event: OpenCodeServerEvent,
): OpenCodePermissionRequest | null => toPermissionRequest(event.properties);

const toQuestionRequest = (value: unknown): OpenCodeQuestionRequest | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.sessionID !== "string" ||
    !Array.isArray(value.questions)
  ) {
    return null;
  }

  const request = value as QuestionRequest;
  return {
    ...request,
    askedAt: Date.now(),
  };
};

const toPermissionRequests = (
  items: readonly unknown[],
): readonly OpenCodePermissionRequest[] | null => {
  const requests: OpenCodePermissionRequest[] = [];
  for (const item of items) {
    const request = toPermissionRequest(item);
    if (!request) return null;
    requests.push(request);
  }
  return requests;
};

const toQuestionRequests = (
  items: readonly unknown[],
): readonly OpenCodeQuestionRequest[] | null => {
  const requests: OpenCodeQuestionRequest[] = [];
  for (const item of items) {
    const request = toQuestionRequest(item);
    if (!request) return null;
    requests.push(request);
  }
  return requests;
};

const extractQuestionRequest = (
  event: OpenCodeServerEvent,
): OpenCodeQuestionRequest | null => toQuestionRequest(event.properties);

const hasSamePermissionPayload = (
  left: OpenCodePermissionRequest,
  right: OpenCodePermissionRequest,
) => JSON.stringify(left.raw) === JSON.stringify(right.raw);

const hasSameQuestionPayload = (
  left: OpenCodeQuestionRequest,
  right: OpenCodeQuestionRequest,
) => {
  const { askedAt: _leftAskedAt, ...leftPayload } = left;
  const { askedAt: _rightAskedAt, ...rightPayload } = right;
  return JSON.stringify(leftPayload) === JSON.stringify(rightPayload);
};

const normalizeUnhandledEvent = (
  event: OpenCodeServerEvent,
): OpenCodeUnhandledEvent => ({
  type: event.type,
  sessionId: event.sessionId,
  properties: event.properties as Record<string, unknown>,
  seenAt: Date.now(),
});

const isSupportedDelta = (
  state: OpenCodeThreadState,
  messageId: string,
  partId: string,
  field: string,
) => {
  const message = state.messagesById[messageId];
  const part = message?.parts.find((candidate) => candidate.id === partId);
  if (!part) return false;

  return (
    field === "text" && (part.type === "text" || part.type === "reasoning")
  );
};

type HistorySyncWindow = {
  sessionChanged: boolean;
  changedMessageIds: Set<string>;
  removedMessageIds: Set<string>;
  changedPartIds: Set<string>;
  updatedParts: Map<
    string,
    {
      messageId: string;
      part: MessageWithParts["parts"][number];
    }
  >;
  removedPartIds: Set<string>;
};

const historyPartKey = (messageId: string, partId: string) =>
  `${messageId}\0${partId}`;

const mergeHistoryMessages = (
  messages: readonly MessageWithParts[],
  state: OpenCodeThreadState,
  syncWindow: HistorySyncWindow,
) => {
  if (
    syncWindow.changedMessageIds.size === 0 &&
    syncWindow.removedMessageIds.size === 0
  )
    return messages.slice();

  const seenMessageIds = new Set<string>();
  const merged: MessageWithParts[] = [];
  for (const message of messages) {
    const messageId = message.info.id;
    seenMessageIds.add(messageId);
    if (syncWindow.removedMessageIds.has(messageId)) continue;
    if (!syncWindow.changedMessageIds.has(messageId)) {
      merged.push(message);
      continue;
    }

    const current = state.messagesById[messageId];
    const loadedPartIds = new Set(message.parts.map((part) => part.id));
    const parts = message.parts.filter(
      (part) =>
        !syncWindow.removedPartIds.has(historyPartKey(messageId, part.id)),
    );
    const appendIfMissing = (part: MessageWithParts["parts"][number]) => {
      const key = historyPartKey(messageId, part.id);
      if (loadedPartIds.has(part.id) || syncWindow.removedPartIds.has(key)) {
        return;
      }
      loadedPartIds.add(part.id);
      parts.push(part);
    };
    for (const part of current?.parts ?? []) {
      if (syncWindow.changedPartIds.has(historyPartKey(messageId, part.id))) {
        appendIfMissing(part);
      }
    }
    for (const update of syncWindow.updatedParts.values()) {
      if (update.messageId === messageId) appendIfMissing(update.part);
    }
    merged.push({
      info: message.info,
      parts,
    });
  }

  for (const messageId of syncWindow.changedMessageIds) {
    if (seenMessageIds.has(messageId)) continue;
    const current = state.messagesById[messageId];
    if (current?.info) {
      merged.push({ info: current.info, parts: [...current.parts] });
    }
  }

  return merged;
};

export class OpenCodeThreadController implements OpenCodeThreadControllerLike {
  private state: OpenCodeThreadState;
  private readonly listeners = new Set<() => void>();
  private readonly getEventSource: OpenCodeEventSourceProvider;
  private unsubscribeFromEvents: (() => void) | null = null;
  private loadPromise: Promise<void> | null = null;
  private historySyncWindow: HistorySyncWindow | null = null;
  private activityRevision = 0;
  private runGeneration = 0;
  private readonly permissionRecoveryFence = new Map<
    string,
    "asked" | "settled"
  >();
  private permissionRecoveryToken: number | null = null;
  private readonly questionRecoveryFence = new Map<
    string,
    "asked" | "settled"
  >();
  private questionRecoveryToken: number | null = null;
  private readonly permissionRepliesInFlight = new Map<string, number>();
  private readonly questionRepliesInFlight = new Map<string, number>();
  private backgroundRefreshQueued = false;
  private reconnectSyncToken = 0;
  private readonly childControllersById = new Map<
    string,
    ChildControllerEntry
  >();
  private readonly childSessionIdByPartId = new Map<string, string>();
  private interactionRecoveryEvents = createInteractionRecoveryEvents();
  private ancestorSessionIds: ReadonlySet<string>;
  private isChildSession = false;
  private readonly stagedMessages = new Map<
    string,
    {
      message: AppendMessage;
      options: OpenCodeUserMessageOptions | undefined;
      pending: PendingUserMessage;
    }
  >();

  private readonly client: OpencodeClient;
  private readonly sessionId: string;

  constructor(
    client: OpencodeClient,
    getEventSource: OpenCodeEventSourceProvider,
    sessionId: string,
  ) {
    this.client = client;
    this.sessionId = sessionId;
    this.state = createOpenCodeThreadState(sessionId);
    this.getEventSource = getEventSource;
    this.ancestorSessionIds = new Set([sessionId]);
  }

  private beginReply(repliesInFlight: Map<string, number>, id: string) {
    repliesInFlight.set(id, (repliesInFlight.get(id) ?? 0) + 1);
  }

  private endReply(repliesInFlight: Map<string, number>, id: string) {
    const remaining = (repliesInFlight.get(id) ?? 0) - 1;
    if (remaining > 0) repliesInFlight.set(id, remaining);
    else repliesInFlight.delete(id);
  }

  private fencePermission(id: string, state: "asked" | "settled") {
    if (this.permissionRecoveryToken !== null) {
      this.permissionRecoveryFence.set(id, state);
    }
  }

  private fenceQuestion(id: string, state: "asked" | "settled") {
    if (this.questionRecoveryToken !== null) {
      this.questionRecoveryFence.set(id, state);
    }
  }

  private cancelInteractionRecovery() {
    this.reconnectSyncToken += 1;
    this.permissionRecoveryToken = null;
    this.permissionRecoveryFence.clear();
    this.questionRecoveryToken = null;
    this.questionRecoveryFence.clear();
    for (const entry of this.childControllersById.values()) {
      entry.controller.cancelInteractionRecovery();
    }
    if (!this.isChildSession) {
      this.interactionRecoveryEvents.permissions.clear();
      this.interactionRecoveryEvents.questions.clear();
    }
  }

  private retainInteractionRecoveryEvent(event: OpenCodeServerEvent) {
    if (this.isChildSession || !event.sessionId) return;

    const events =
      event.type === "permission.asked" || event.type === "permission.replied"
        ? this.permissionRecoveryToken !== null
          ? this.interactionRecoveryEvents.permissions
          : null
        : event.type === "question.asked" ||
            event.type === "question.replied" ||
            event.type === "question.rejected"
          ? this.questionRecoveryToken !== null
            ? this.interactionRecoveryEvents.questions
            : null
          : null;
    if (!events) return;

    const isAsk =
      event.type === "permission.asked" || event.type === "question.asked";
    const requestId = isAsk
      ? (event.type === "permission.asked"
          ? extractPermissionRequest(event)
          : extractQuestionRequest(event)
        )?.id
      : event.properties.requestID;
    if (typeof requestId !== "string") return;

    const requests =
      events.get(event.sessionId) ??
      new Map<string, InteractionRecoveryEntry>();
    const entry = requests.get(requestId);
    requests.set(
      requestId,
      isAsk ? { ...entry, asked: event } : { ...entry, settled: event },
    );
    events.set(event.sessionId, requests);
  }

  private replayInteractionRecoveryEvents() {
    for (const { asked, settled } of [
      ...(this.interactionRecoveryEvents.permissions
        .get(this.sessionId)
        ?.values() ?? []),
      ...(this.interactionRecoveryEvents.questions
        .get(this.sessionId)
        ?.values() ?? []),
    ]) {
      if (asked) this.handleServerEvent(asked);
      if (settled) this.handleServerEvent(settled);
    }
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error("[react-opencode] Listener threw an error", error);
      }
    }
  }

  private updateChildSnapshot(
    sessionId: string,
    childState: OpenCodeThreadState,
  ) {
    if (this.state.childSessionsById[sessionId] === childState) return;

    const childSessionsById = nullProtoRecord(this.state.childSessionsById);
    childSessionsById[sessionId] = childState;
    this.state = {
      ...this.state,
      childSessionsById,
    };
    this.notifyListeners();
  }

  private attachChildController(
    sessionId: string,
    entry: ChildControllerEntry,
  ) {
    if (entry.unsubscribe) return;

    entry.unsubscribe = entry.controller.subscribe(() => {
      this.updateChildSnapshot(sessionId, entry.controller.getState());
    });
    this.updateChildSnapshot(sessionId, entry.controller.getState());
    if (entry.controller.getState().loadState.type !== "ready") {
      void entry.controller.load().catch(() => undefined);
    }
  }

  private detachChildControllers() {
    for (const entry of this.childControllersById.values()) {
      entry.unsubscribe?.();
      entry.unsubscribe = null;
    }
  }

  private discard() {
    this.loadPromise = null;
    this.historySyncWindow = null;
    this.backgroundRefreshQueued = false;
    this.cancelInteractionRecovery();
    this.unsubscribeFromEvents?.();
    this.unsubscribeFromEvents = null;
    for (const entry of this.childControllersById.values()) {
      entry.unsubscribe?.();
      entry.controller.discard();
    }
    this.childControllersById.clear();
    this.childSessionIdByPartId.clear();
    this.listeners.clear();
  }

  private rebuildChildSessionIndex() {
    this.childSessionIdByPartId.clear();
    for (const message of Object.values(this.state.messagesById)) {
      for (const part of message.parts) {
        const sessionId = getOpenCodeTaskSessionId(part);
        if (sessionId) {
          this.childSessionIdByPartId.set(part.id, sessionId);
        }
      }
    }
    this.syncChildControllers();
  }

  private updateChildSessionIndex(part: Part) {
    const previousSessionId = this.childSessionIdByPartId.get(part.id);
    const sessionId = getOpenCodeTaskSessionId(part);
    if (sessionId === previousSessionId) return;

    if (sessionId) {
      this.childSessionIdByPartId.set(part.id, sessionId);
    } else {
      this.childSessionIdByPartId.delete(part.id);
    }
    this.syncChildControllers();
  }

  private removeFromChildSessionIndex(partId: string) {
    if (!this.childSessionIdByPartId.delete(partId)) return;
    this.syncChildControllers();
  }

  private syncChildControllers() {
    const sessionIds = new Set(this.childSessionIdByPartId.values());
    for (const sessionId of this.ancestorSessionIds) {
      sessionIds.delete(sessionId);
    }

    let childSessionsById = this.state.childSessionsById;
    for (const [sessionId, entry] of this.childControllersById) {
      if (sessionIds.has(sessionId)) continue;

      entry.unsubscribe?.();
      entry.controller.discard();
      this.childControllersById.delete(sessionId);
      const remaining = nullProtoRecord(childSessionsById);
      delete remaining[sessionId];
      childSessionsById = remaining;
    }

    const added: [string, ChildControllerEntry][] = [];
    for (const sessionId of sessionIds) {
      if (this.childControllersById.has(sessionId)) continue;

      const controller = new OpenCodeThreadController(
        this.client,
        this.getEventSource,
        sessionId,
      );
      controller.ancestorSessionIds = new Set([
        ...this.ancestorSessionIds,
        sessionId,
      ]);
      controller.isChildSession = true;
      controller.permissionRecoveryToken = this.permissionRecoveryToken;
      controller.questionRecoveryToken = this.questionRecoveryToken;
      controller.interactionRecoveryEvents = this.interactionRecoveryEvents;
      controller.replayInteractionRecoveryEvents();
      const entry: ChildControllerEntry = {
        controller,
        unsubscribe: null,
      };
      this.childControllersById.set(sessionId, entry);
      const nextChildSessionsById = nullProtoRecord(childSessionsById);
      nextChildSessionsById[sessionId] = controller.getState();
      childSessionsById = nextChildSessionsById;
      added.push([sessionId, entry]);
    }

    if (childSessionsById !== this.state.childSessionsById) {
      this.state = { ...this.state, childSessionsById };
    }

    for (const [sessionId, entry] of added) {
      if (this.listeners.size === 0) break;
      this.attachChildController(sessionId, entry);
    }
  }

  private syncChildSessionIndex(
    event: Parameters<typeof reduceOpenCodeThreadStateInternal>[1],
  ) {
    switch (event.type) {
      case "history.loaded":
      case "message.removed":
        this.rebuildChildSessionIndex();
        break;
      case "part.updated":
        this.updateChildSessionIndex(event.part);
        break;
      case "part.removed":
        this.removeFromChildSessionIndex(event.partId);
        break;
      default:
        break;
    }
  }

  private ensureEventSubscription() {
    if (this.unsubscribeFromEvents) return;

    this.unsubscribeFromEvents = this.getEventSource().subscribe((event) => {
      if (event.type === STREAM_RECONNECTED_EVENT_TYPE) {
        this.handleStreamReconnect();
        return;
      }
      this.retainInteractionRecoveryEvent(event);
      if (event.sessionId !== this.sessionId) return;
      this.handleServerEvent(event);
    });
  }

  private collectInteractionRecoveryTargets(
    targets = new Map<string, OpenCodeThreadController>(),
    recoveryToken?: number,
  ) {
    if (recoveryToken !== undefined) {
      this.permissionRecoveryFence.clear();
      this.questionRecoveryFence.clear();
      this.permissionRecoveryToken = recoveryToken;
      this.questionRecoveryToken = recoveryToken;
    }
    targets.set(this.sessionId, this);
    for (const entry of this.childControllersById.values()) {
      entry.controller.collectInteractionRecoveryTargets(
        targets,
        recoveryToken,
      );
    }
    return targets;
  }

  private finishPermissionRecovery(token: number) {
    if (this.permissionRecoveryToken !== token) return;
    this.permissionRecoveryToken = null;
    this.permissionRecoveryFence.clear();
    if (!this.isChildSession) {
      this.interactionRecoveryEvents.permissions.clear();
    }
  }

  private finishQuestionRecovery(token: number) {
    if (this.questionRecoveryToken !== token) return;
    this.questionRecoveryToken = null;
    this.questionRecoveryFence.clear();
    if (!this.isChildSession) {
      this.interactionRecoveryEvents.questions.clear();
    }
  }

  private reconcilePermissions(requests: readonly OpenCodePermissionRequest[]) {
    const pending = nullProtoRecord<OpenCodePermissionRequest>();
    for (const request of requests) {
      if (request.sessionId !== this.sessionId) continue;
      if (this.permissionRepliesInFlight.has(request.id)) continue;
      const settled = this.state.interactions.permissions.resolved[request.id];
      if (
        this.permissionRecoveryFence.get(request.id) === "settled" &&
        !settled
      ) {
        const reply = this.interactionRecoveryEvents.permissions
          .get(this.sessionId)
          ?.get(request.id)?.settled?.properties.reply;
        if (reply === "once" || reply === "always" || reply === "reject") {
          this.dispatchSettled(
            { type: "permission.asked", request },
            { type: "permission.replied", permissionId: request.id, reply },
          );
        }
        continue;
      }
      if (this.permissionRecoveryFence.has(request.id)) continue;
      if (settled) continue;
      const existing = this.state.interactions.permissions.pending[request.id];
      pending[request.id] =
        existing && hasSamePermissionPayload(existing, request)
          ? existing
          : request;
    }
    for (const [id, request] of Object.entries(
      this.state.interactions.permissions.pending,
    )) {
      if (
        this.permissionRepliesInFlight.has(id) ||
        this.permissionRecoveryFence.get(id) === "asked"
      ) {
        pending[id] = request;
      }
    }
    this.dispatch({ type: "permissions.reconciled", pending });
  }

  private reconcileQuestions(requests: readonly OpenCodeQuestionRequest[]) {
    const pending = nullProtoRecord<OpenCodeQuestionRequest>();
    for (const request of requests) {
      if (request.sessionID !== this.sessionId) continue;
      if (this.questionRepliesInFlight.has(request.id)) continue;
      const settled =
        this.state.interactions.questions.answered[request.id] ??
        this.state.interactions.questions.rejected[request.id];
      if (
        this.questionRecoveryFence.get(request.id) === "settled" &&
        !settled
      ) {
        const reply = this.interactionRecoveryEvents.questions
          .get(this.sessionId)
          ?.get(request.id)?.settled;
        const answers = reply?.properties.answers;
        if (reply?.type === "question.rejected") {
          this.dispatchSettled(
            { type: "question.asked", request },
            { type: "question.rejected", questionId: request.id },
          );
        } else if (Array.isArray(answers)) {
          this.dispatchSettled(
            { type: "question.asked", request },
            {
              type: "question.replied",
              questionId: request.id,
              answers: answers as never,
            },
          );
        }
        continue;
      }
      if (this.questionRecoveryFence.has(request.id)) continue;
      if (settled) continue;
      const existing = this.state.interactions.questions.pending[request.id];
      pending[request.id] =
        existing && hasSameQuestionPayload(existing, request)
          ? existing
          : request;
    }
    for (const [id, request] of Object.entries(
      this.state.interactions.questions.pending,
    )) {
      if (
        this.questionRepliesInFlight.has(id) ||
        this.questionRecoveryFence.get(id) === "asked"
      ) {
        pending[id] = request;
      }
    }
    this.dispatch({ type: "questions.reconciled", pending });
  }

  private handleStreamReconnect() {
    this.refreshInBackground();
    const token = ++this.reconnectSyncToken;
    const activityRevision = this.activityRevision;

    if (this.isChildSession) return;
    this.interactionRecoveryEvents.permissions.clear();
    this.interactionRecoveryEvents.questions.clear();
    const interactionRecoveryTargets = this.collectInteractionRecoveryTargets(
      new Map(),
      token,
    );

    void this.client.session
      .status(undefined, OPEN_CODE_REQUEST_OPTIONS)
      .catch(() => null)
      .then((response) => {
        if (
          !response ||
          token !== this.reconnectSyncToken ||
          activityRevision !== this.activityRevision
        )
          return;
        const status = response.data?.[this.sessionId];
        if (status) {
          this.dispatch({ type: "session.status", status });
        } else {
          this.dispatch({ type: "session.idle", sessionId: this.sessionId });
        }
      });

    void this.client.permission
      .list(undefined, OPEN_CODE_REQUEST_OPTIONS)
      .catch(() => null)
      .then(async (response) => {
        if (token !== this.reconnectSyncToken) return;
        const recoveryControllers = new Set(
          interactionRecoveryTargets.values(),
        );
        try {
          const requests =
            response && Array.isArray(response.data)
              ? toPermissionRequests(response.data)
              : null;
          await this.visitInteractionRecoveryTree(
            (controller) => {
              recoveryControllers.add(controller);
              if (requests) controller.reconcilePermissions(requests);
            },
            () => token === this.reconnectSyncToken,
          );
        } finally {
          for (const controller of this.collectInteractionRecoveryTargets().values()) {
            recoveryControllers.add(controller);
          }
          for (const controller of recoveryControllers) {
            controller.finishPermissionRecovery(token);
          }
        }
      });

    void this.client.question
      .list(undefined, OPEN_CODE_REQUEST_OPTIONS)
      .catch(() => null)
      .then(async (response) => {
        if (token !== this.reconnectSyncToken) return;
        const recoveryControllers = new Set(
          interactionRecoveryTargets.values(),
        );
        try {
          const requests =
            response && Array.isArray(response.data)
              ? toQuestionRequests(response.data)
              : null;
          await this.visitInteractionRecoveryTree(
            (controller) => {
              recoveryControllers.add(controller);
              if (requests) controller.reconcileQuestions(requests);
            },
            () => token === this.reconnectSyncToken,
          );
        } finally {
          for (const controller of this.collectInteractionRecoveryTargets().values()) {
            recoveryControllers.add(controller);
          }
          for (const controller of recoveryControllers) {
            controller.finishQuestionRecovery(token);
          }
        }
      });
  }

  public dispose() {
    this.cancelInteractionRecovery();
    this.unsubscribeFromEvents?.();
    this.unsubscribeFromEvents = null;
    this.detachChildControllers();
    this.listeners.clear();
  }

  public getState = () => {
    return this.state;
  };

  public subscribe = (listener: () => void) => {
    const wasDetached = this.listeners.size === 0;
    this.listeners.add(listener);
    this.ensureEventSubscription();
    if (wasDetached) {
      for (const [sessionId, entry] of this.childControllersById) {
        this.attachChildController(sessionId, entry);
      }
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.unsubscribeFromEvents?.();
        this.unsubscribeFromEvents = null;
        this.detachChildControllers();
      }
    };
  };

  public async load(force = false) {
    if (this.loadPromise && !force) return this.loadPromise;

    this.backgroundRefreshQueued = false;
    this.dispatch({ type: "history.loading" });
    const previousWindow = this.historySyncWindow;
    const syncWindow: HistorySyncWindow = {
      sessionChanged: false,
      changedMessageIds: new Set(previousWindow?.changedMessageIds),
      removedMessageIds: new Set(previousWindow?.removedMessageIds),
      changedPartIds: new Set(previousWindow?.changedPartIds),
      updatedParts: new Map(previousWindow?.updatedParts),
      removedPartIds: new Set(previousWindow?.removedPartIds),
    };
    this.historySyncWindow = syncWindow;

    const request = Promise.all([
      this.client.session.get(
        { sessionID: this.sessionId },
        OPEN_CODE_REQUEST_OPTIONS,
      ),
      this.client.session.messages(
        { sessionID: this.sessionId },
        OPEN_CODE_REQUEST_OPTIONS,
      ),
    ])
      .then(([sessionResponse, messagesResponse]) => {
        if (this.loadPromise !== request || this.backgroundRefreshQueued)
          return;
        this.historySyncWindow = null;
        const messages = mergeHistoryMessages(
          (messagesResponse.data ?? []) as MessageWithParts[],
          this.state,
          syncWindow,
        );
        this.dispatchHistoryLoaded(
          {
            type: "history.loaded",
            session: syncWindow.sessionChanged
              ? this.state.session
              : (sessionResponse.data ?? null),
            messages,
          },
          syncWindow.changedMessageIds,
        );
      })
      .catch((error) => {
        if (this.loadPromise !== request) throw error;
        this.historySyncWindow = null;
        this.dispatch({ type: "history.failed", error });
        throw error;
      })
      .finally(() => {
        if (this.loadPromise === request) {
          this.loadPromise = null;
          if (this.backgroundRefreshQueued) {
            this.backgroundRefreshQueued = false;
            void this.refreshInBackground();
          }
        }
      });

    this.loadPromise = request;
    return request;
  }

  public refresh() {
    return this.load(true);
  }

  private createPendingMessage(message: AppendMessage): PendingUserMessage {
    const parts = flattenMessageParts(
      message,
    ) as readonly ThreadUserMessagePart[];

    return {
      clientId: generateId(),
      sessionId: this.sessionId,
      createdAt: Date.now(),
      parentId: message.parentId,
      sourceId: message.sourceId,
      runConfig: message.runConfig,
      parts,
      contentText: getTextContent(parts),
      status: "pending",
    };
  }

  private async promptMessage(
    message: AppendMessage,
    pending: PendingUserMessage,
    options?: OpenCodeUserMessageOptions,
  ) {
    this.runGeneration++;
    this.dispatch({ type: "run.started" });

    try {
      await this.client.session.promptAsync(
        {
          sessionID: this.sessionId,
          // The SDK currently infers a narrower payload shape than the runtime
          // accepts here, so we cast at the boundary instead of widening types
          // throughout the caller stack.
          parts: getPromptParts(message) as never,
          ...(options?.model ? { model: options.model } : {}),
          ...(options?.agent ? { agent: options.agent } : {}),
          ...(options?.noReply ? { noReply: options.noReply } : {}),
        },
        OPEN_CODE_REQUEST_OPTIONS,
      );
    } catch (error) {
      this.dispatch({
        type: "local.message.failed",
        clientId: pending.clientId,
        error,
      });
      throw error;
    }
  }

  public async sendMessage(
    message: AppendMessage,
    options?: OpenCodeUserMessageOptions,
  ) {
    if (message.role !== "user") {
      throw new Error("OpenCode only supports sending user messages");
    }

    const pending = this.createPendingMessage(message);
    this.dispatch({ type: "local.message.queued", pending });
    await this.promptMessage(message, pending, options);
  }

  public async stageMessage(
    message: AppendMessage,
    options?: OpenCodeUserMessageOptions,
  ) {
    if (message.role !== "user") {
      throw new Error("OpenCode only supports sending user messages");
    }

    const pending = this.createPendingMessage(message);
    this.stagedMessages.set(`local:${pending.clientId}`, {
      message,
      options,
      pending,
    });
    this.dispatch({ type: "local.message.queued", pending });
  }

  public async sendStagedMessage(
    parentId: string,
    options?: OpenCodeUserMessageOptions,
  ) {
    const staged = this.stagedMessages.get(parentId);
    if (!staged) return false;

    if (
      this.state.pendingUserMessages[staged.pending.clientId]?.status ===
      "failed"
    ) {
      this.dispatch({ type: "local.message.queued", pending: staged.pending });
    }

    await this.promptMessage(
      staged.message,
      staged.pending,
      options ?? staged.options,
    );
    this.stagedMessages.delete(parentId);
    return true;
  }

  public async cancel() {
    const runGeneration = this.runGeneration;
    this.dispatch({ type: "run.cancelling" });
    try {
      await this.client.session.abort(
        {
          sessionID: this.sessionId,
        },
        OPEN_CODE_REQUEST_OPTIONS,
      );
    } catch (error) {
      if (
        runGeneration === this.runGeneration &&
        this.state.runState.type !== "idle" &&
        this.state.runState.type !== "error"
      ) {
        this.dispatch({ type: "run.failed", error });
      }
      throw error;
    }
  }

  public async revert(messageId: string) {
    const runGeneration = this.runGeneration;
    const wasRunning = isOpenCodeStateRunning(this.state);
    // Reverting a finished turn leaves the session idle, so the server sends no
    // busy-to-idle transition and the transient state would never be left.
    if (wasRunning) {
      this.dispatch({ type: "run.reverting" });
    }
    try {
      await this.client.session.revert(
        {
          sessionID: this.sessionId,
          messageID: messageId,
        },
        OPEN_CODE_REQUEST_OPTIONS,
      );
    } catch (error) {
      if (
        runGeneration === this.runGeneration &&
        (!wasRunning || this.state.runState.type === "reverting")
      ) {
        this.dispatch({ type: "run.failed", error });
      }
      throw error;
    }
  }

  public async unrevert() {
    await this.client.session.unrevert(
      {
        sessionID: this.sessionId,
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
  }

  public async fork(messageId: string) {
    const response = await this.client.session.fork(
      {
        sessionID: this.sessionId,
        messageID: messageId,
      },
      OPEN_CODE_REQUEST_OPTIONS,
    );
    if (!response.data?.id) {
      throw new Error("Failed to fork OpenCode session");
    }
    return response.data.id;
  }

  public async replyToPermission(
    permissionId: string,
    response: OpenCodePermissionResponse,
  ) {
    this.beginReply(this.permissionRepliesInFlight, permissionId);
    try {
      await this.client.permission.reply(
        {
          requestID: permissionId,
          reply: response,
        },
        OPEN_CODE_REQUEST_OPTIONS,
      );

      this.fencePermission(permissionId, "settled");
      this.dispatch({
        type: "permission.replied",
        permissionId,
        reply: response,
      });
    } finally {
      this.endReply(this.permissionRepliesInFlight, permissionId);
    }
  }

  public async replyToQuestion(
    questionId: string,
    answers: readonly QuestionAnswer[],
  ) {
    this.beginReply(this.questionRepliesInFlight, questionId);
    try {
      await this.client.question.reply(
        {
          requestID: questionId,
          answers: answers.slice(),
        },
        OPEN_CODE_REQUEST_OPTIONS,
      );

      this.fenceQuestion(questionId, "settled");
      this.dispatch({
        type: "question.replied",
        questionId,
        answers,
      });
    } finally {
      this.endReply(this.questionRepliesInFlight, questionId);
    }
  }

  public async rejectQuestion(questionId: string) {
    this.beginReply(this.questionRepliesInFlight, questionId);
    try {
      await this.client.question.reject(
        {
          requestID: questionId,
        },
        OPEN_CODE_REQUEST_OPTIONS,
      );

      this.fenceQuestion(questionId, "settled");
      this.dispatch({
        type: "question.rejected",
        questionId,
      });
    } finally {
      this.endReply(this.questionRepliesInFlight, questionId);
    }
  }

  private async refreshInBackground() {
    if (this.loadPromise) {
      this.backgroundRefreshQueued = true;
    } else {
      void this.refresh().catch(() => undefined);
    }

    await this.waitForLoadChain();
  }

  private async waitForLoadChain() {
    let previousLoad: Promise<void> | null = null;
    while (this.loadPromise && this.loadPromise !== previousLoad) {
      previousLoad = this.loadPromise;
      await previousLoad.catch(() => undefined);
    }
  }

  private async visitInteractionRecoveryTree(
    visit: (controller: OpenCodeThreadController) => void,
    isCurrent: () => boolean,
  ): Promise<void> {
    if (!isCurrent()) return;
    visit(this);
    const children = new Set(
      [...this.childControllersById.values()].map(
        ({ controller }) => controller,
      ),
    );
    await Promise.all([
      ...[...children].map((controller) =>
        controller.visitInteractionRecoveryTree(visit, isCurrent),
      ),
      this.waitForLoadChain().then(async () => {
        if (!isCurrent()) return;
        await Promise.all(
          [...this.childControllersById.values()]
            .filter(({ controller }) => !children.has(controller))
            .map(({ controller }) =>
              controller.visitInteractionRecoveryTree(visit, isCurrent),
            ),
        );
      }),
    ]);
  }

  private handleServerEvent(event: OpenCodeServerEvent) {
    switch (event.type) {
      case "session.updated": {
        const session = event.properties.info;
        if (session && typeof session === "object") {
          this.dispatch({
            type: "session.updated",
            session: session as never,
          });
        }
        return;
      }

      case "session.status":
        if (event.properties.status) {
          this.dispatch({
            type: "session.status",
            status: event.properties.status as SessionStatus,
          });
        }
        return;

      case "session.idle":
        this.dispatch({ type: "session.idle", sessionId: this.sessionId });
        return;

      case "session.compacted":
        this.dispatch({ type: "session.compacted", sessionId: this.sessionId });
        void this.refreshInBackground();
        return;

      case "session.error":
        if (event.properties.error !== undefined) {
          this.dispatch({
            type: "run.failed",
            error: event.properties.error,
          });
          return;
        }
        break;

      case "message.updated": {
        const info = event.properties.info;
        if (info && typeof info === "object" && "id" in info) {
          this.dispatch({
            type: "message.updated",
            info: info as never,
          });
        }
        return;
      }

      case "message.removed":
        if (typeof event.properties.messageID === "string") {
          this.dispatch({
            type: "message.removed",
            messageId: event.properties.messageID,
          });
        }
        return;

      case "message.part.updated": {
        const part = event.properties.part;
        const messageId =
          part &&
          typeof part === "object" &&
          "messageID" in part &&
          typeof part.messageID === "string"
            ? part.messageID
            : undefined;

        if (messageId && part && typeof part === "object") {
          const stateEvent = {
            type: "part.updated" as const,
            messageId,
            part: part as never,
          };
          if (!(messageId in this.state.messagesById)) {
            void this.refreshInBackground();
            this.trackHistoryEvent(stateEvent);
            return;
          }

          this.dispatch(stateEvent);
        }
        return;
      }

      case "message.part.delta":
        if (
          typeof event.properties.messageID === "string" &&
          typeof event.properties.partID === "string" &&
          typeof event.properties.field === "string" &&
          typeof event.properties.delta === "string"
        ) {
          const { messageID, partID, field, delta } = event.properties;
          const stateEvent = {
            type: "part.delta" as const,
            messageId: messageID,
            partId: partID,
            field,
            delta,
          };

          if (isSupportedDelta(this.state, messageID, partID, field)) {
            this.dispatch(stateEvent);
          } else {
            void this.refreshInBackground();
            this.trackHistoryEvent(stateEvent);
          }
        }
        return;

      case "message.part.removed":
        if (
          typeof event.properties.messageID === "string" &&
          typeof event.properties.partID === "string"
        ) {
          const stateEvent = {
            type: "part.removed" as const,
            messageId: event.properties.messageID,
            partId: event.properties.partID,
          };
          if (!(event.properties.messageID in this.state.messagesById)) {
            void this.refreshInBackground();
            this.trackHistoryEvent(stateEvent);
            return;
          }

          this.dispatch(stateEvent);
        }
        return;

      case "permission.asked": {
        const request = extractPermissionRequest(event);
        if (request) {
          this.fencePermission(request.id, "asked");
          this.dispatch({
            type: "permission.asked",
            request,
          });
        }
        return;
      }

      case "permission.replied":
        if (typeof event.properties.requestID === "string") {
          this.fencePermission(event.properties.requestID, "settled");
          if (
            event.properties.reply !== "once" &&
            event.properties.reply !== "always" &&
            event.properties.reply !== "reject"
          ) {
            return;
          }
          this.dispatch({
            type: "permission.replied",
            permissionId: event.properties.requestID,
            reply: event.properties.reply,
          });
        }
        return;

      case "question.asked": {
        const request = extractQuestionRequest(event);
        if (request) {
          this.fenceQuestion(request.id, "asked");
          this.dispatch({
            type: "question.asked",
            request,
          });
        }
        return;
      }

      case "question.replied":
        if (typeof event.properties.requestID === "string") {
          this.fenceQuestion(event.properties.requestID, "settled");
          if (!Array.isArray(event.properties.answers)) return;
          this.dispatch({
            type: "question.replied",
            questionId: event.properties.requestID,
            answers: event.properties.answers as never,
          });
        }
        return;

      case "question.rejected":
        if (typeof event.properties.requestID === "string") {
          this.fenceQuestion(event.properties.requestID, "settled");
          this.dispatch({
            type: "question.rejected",
            questionId: event.properties.requestID,
          });
        }
        return;
    }

    this.dispatch({
      type: "unhandled.event",
      event: normalizeUnhandledEvent(event),
    });
  }

  private trackHistoryEvent(
    event: Parameters<typeof reduceOpenCodeThreadStateInternal>[1],
  ) {
    const syncWindow = this.historySyncWindow;
    if (!syncWindow) return;
    switch (event.type) {
      case "session.updated":
        syncWindow.sessionChanged = true;
        break;
      case "message.updated":
        syncWindow.changedMessageIds.add(event.info.id);
        syncWindow.removedMessageIds.delete(event.info.id);
        break;
      case "message.removed":
        syncWindow.changedMessageIds.delete(event.messageId);
        syncWindow.removedMessageIds.add(event.messageId);
        break;
      case "part.updated": {
        syncWindow.changedMessageIds.add(event.messageId);
        const key = historyPartKey(event.messageId, event.part.id);
        syncWindow.changedPartIds.add(key);
        syncWindow.updatedParts.set(key, {
          messageId: event.messageId,
          part: event.part,
        });
        syncWindow.removedPartIds.delete(key);
        break;
      }
      case "part.delta":
        syncWindow.changedMessageIds.add(event.messageId);
        syncWindow.changedPartIds.add(
          historyPartKey(event.messageId, event.partId),
        );
        break;
      case "part.removed": {
        syncWindow.changedMessageIds.add(event.messageId);
        const key = historyPartKey(event.messageId, event.partId);
        syncWindow.changedPartIds.delete(key);
        syncWindow.updatedParts.delete(key);
        syncWindow.removedPartIds.add(key);
        break;
      }
    }
  }

  private dispatch(
    event: Parameters<typeof reduceOpenCodeThreadStateInternal>[1],
  ) {
    this.trackHistoryEvent(event);
    const nextState = reduceOpenCodeThreadStateInternal(this.state, event);
    this.commitState(event, nextState);
  }

  private dispatchSettled(
    asked: Parameters<typeof reduceOpenCodeThreadStateInternal>[1],
    settled: Parameters<typeof reduceOpenCodeThreadStateInternal>[1],
  ) {
    const nextState = reduceOpenCodeThreadStateInternal(
      reduceOpenCodeThreadStateInternal(this.state, asked),
      settled,
    );
    this.commitState(settled, nextState);
  }

  private dispatchHistoryLoaded(
    event: Extract<OpenCodeStateEvent, { type: "history.loaded" }>,
    changedMessageIds: ReadonlySet<string>,
  ) {
    let nextState = reduceOpenCodeThreadStateInternal(this.state, event);
    let messagesById: ReturnType<typeof copyMessagesById> | null = null;
    for (const messageId of changedMessageIds) {
      const shadowParts = this.state.messagesById[messageId]?.shadowParts;
      const loaded = nextState.messagesById[messageId];
      if (!shadowParts || !loaded) continue;
      messagesById ??= copyMessagesById(nextState.messagesById);
      messagesById[messageId] = { ...loaded, shadowParts };
    }
    if (messagesById) nextState = { ...nextState, messagesById };
    this.commitState(event, nextState);
  }

  private commitState(
    event: Parameters<typeof reduceOpenCodeThreadStateInternal>[1],
    nextState: OpenCodeThreadState,
  ) {
    if (nextState === this.state) return;
    if (
      nextState.sessionStatus !== this.state.sessionStatus ||
      nextState.runState !== this.state.runState
    ) {
      this.activityRevision += 1;
    }
    this.state = nextState;
    this.syncChildSessionIndex(event);
    this.notifyListeners();
  }
}
