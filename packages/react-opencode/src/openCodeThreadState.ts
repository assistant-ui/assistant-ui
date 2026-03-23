import type {
  Message,
  MessageWithParts,
  OpenCodeServerMessage,
  OpenCodeStateEvent,
  OpenCodeThreadState,
  PendingUserMessage,
  ThreadUserMessagePart,
} from "./types";

const PENDING_MATCH_WINDOW_MS = 2 * 60 * 1000;

const extractCreatedAt = (message: Message | undefined): number | undefined => {
  const created = message?.time?.created;
  return typeof created === "number" ? created : undefined;
};

const normalizeText = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const pendingFingerprint = (pending: PendingUserMessage) =>
  normalizeText(pending.contentText);

const partTextFingerprint = (parts: readonly ThreadUserMessagePart[]) =>
  normalizeText(
    parts
      .map((part) => {
        if (part.type === "text") return part.text;
        if (part.type === "image") return part.filename ?? part.image;
        if (part.type === "file") return part.filename ?? part.data;
        if (part.type === "data") return JSON.stringify(part.data);
        if (part.type === "audio") return part.audio.data;
        return "";
      })
      .join("\n"),
  );

const serverFingerprint = (message: MessageWithParts) =>
  normalizeText(
    message.parts
      .map((part) => {
        if (part.type === "text") return part.text ?? "";
        if (part.type === "file") return part.filename ?? part.url ?? "";
        if (part.type === "tool")
          return JSON.stringify(part.state?.input ?? {});
        return "";
      })
      .join("\n"),
  );

const sortMessageIds = (
  messagesById: Readonly<Record<string, OpenCodeServerMessage>>,
  ids: Iterable<string>,
) => {
  return [...ids].sort((leftId, rightId) => {
    const left = messagesById[leftId];
    const right = messagesById[rightId];
    const leftCreated = extractCreatedAt(left?.info) ?? Number.MAX_SAFE_INTEGER;
    const rightCreated =
      extractCreatedAt(right?.info) ?? Number.MAX_SAFE_INTEGER;
    if (leftCreated !== rightCreated) return leftCreated - rightCreated;
    return leftId.localeCompare(rightId);
  });
};

const withMessage = (
  state: OpenCodeThreadState,
  messageId: string,
  updater: (
    current: OpenCodeServerMessage | undefined,
  ) => OpenCodeServerMessage,
): OpenCodeThreadState => {
  const nextMessage = updater(state.messagesById[messageId]);
  const messagesById = {
    ...state.messagesById,
    [messageId]: nextMessage,
  };
  const messageOrder = state.messageOrder.includes(messageId)
    ? sortMessageIds(messagesById, state.messageOrder)
    : sortMessageIds(messagesById, [...state.messageOrder, messageId]);

  return {
    ...state,
    messagesById,
    messageOrder,
  };
};

const removePending = (
  state: OpenCodeThreadState,
  clientId: string,
): OpenCodeThreadState => {
  if (!(clientId in state.pendingUserMessages)) return state;
  const pendingUserMessages = { ...state.pendingUserMessages };
  delete pendingUserMessages[clientId];
  return {
    ...state,
    pendingUserMessages,
  };
};

const findPendingMatchByHistory = (
  state: OpenCodeThreadState,
  message: MessageWithParts,
) => {
  const createdAt = extractCreatedAt(message.info);
  const fingerprint = serverFingerprint(message);
  const candidates = (
    Object.values(state.pendingUserMessages) as PendingUserMessage[]
  ).filter(
    (pending) =>
      pending.status === "pending" &&
      (createdAt === undefined ||
        Math.abs(pending.createdAt - createdAt) <= PENDING_MATCH_WINDOW_MS) &&
      (fingerprint.length === 0 ||
        pendingFingerprint(pending) === fingerprint ||
        partTextFingerprint(pending.parts) === fingerprint),
  );

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    return candidates.sort(
      (left, right) => left.createdAt - right.createdAt,
    )[0];
  }
  return undefined;
};

const findPendingMatchByMessageInfo = (
  state: OpenCodeThreadState,
  message: Message,
) => {
  const createdAt = extractCreatedAt(message);
  const candidates = (
    Object.values(state.pendingUserMessages) as PendingUserMessage[]
  ).filter(
    (pending) =>
      pending.status === "pending" &&
      (createdAt === undefined ||
        Math.abs(pending.createdAt - createdAt) <= PENDING_MATCH_WINDOW_MS),
  );

  if (candidates.length === 1) return candidates[0];
  return undefined;
};

const historyLoaded = (
  state: OpenCodeThreadState,
  session: OpenCodeThreadState["session"],
  messages: readonly MessageWithParts[],
): OpenCodeThreadState => {
  let nextState: OpenCodeThreadState = {
    ...state,
    session,
    loadState: { type: "ready" },
    messagesById: {} as Readonly<Record<string, OpenCodeServerMessage>>,
    messageOrder: [],
    sync: {
      ...state.sync,
      lastHistoryLoadAt: Date.now(),
    },
  };

  const nextMessagesById: Record<string, OpenCodeServerMessage> = {};
  for (const message of messages) {
    const pendingMatch =
      message.info.role === "user"
        ? findPendingMatchByHistory(nextState, message)
        : undefined;

    nextMessagesById[message.info.id] = {
      id: message.info.id,
      info: message.info,
      parts: message.parts,
      shadowParts:
        message.parts.length === 0 && pendingMatch
          ? pendingMatch.parts
          : undefined,
    };

    if (pendingMatch) {
      nextState = removePending(nextState, pendingMatch.clientId);
    }
  }

  nextState = {
    ...nextState,
    messagesById: nextMessagesById,
    messageOrder: sortMessageIds(
      nextMessagesById,
      Object.keys(nextMessagesById),
    ),
  };

  return nextState;
};

const removeMessagePart = (
  parts: readonly import("@opencode-ai/sdk").Part[],
  partId: string,
) => parts.filter((part) => part.id !== partId);

const upsertMessagePart = (
  parts: readonly import("@opencode-ai/sdk").Part[],
  part: import("@opencode-ai/sdk").Part,
) => {
  if (!part.id) return [...parts, part];
  const index = parts.findIndex((candidate) => candidate.id === part.id);
  if (index === -1) return [...parts, part];
  const nextParts = [...parts];
  nextParts[index] = part;
  return nextParts;
};

export const createOpenCodeThreadState = (
  sessionId: string,
): OpenCodeThreadState => ({
  sessionId,
  session: null,
  loadState: { type: "idle" },
  runState: { type: "idle" },
  messageOrder: [],
  messagesById: {} as Readonly<Record<string, OpenCodeServerMessage>>,
  pendingUserMessages: {} as Readonly<Record<string, PendingUserMessage>>,
  permissions: {
    pending: {} as Readonly<
      Record<string, import("./types").OpenCodePermissionRequest>
    >,
    resolved: {} as Readonly<
      Record<string, { approved: boolean; respondedAt: number }>
    >,
  },
  sync: {},
});

export const reduceOpenCodeThreadState = (
  state: OpenCodeThreadState,
  event: OpenCodeStateEvent,
): OpenCodeThreadState => {
  switch (event.type) {
    case "history.loading":
      return {
        ...state,
        loadState: { type: "loading" },
      };

    case "history.loaded":
      return historyLoaded(state, event.session, event.messages);

    case "history.failed":
      return {
        ...state,
        loadState: { type: "error", error: event.error },
      };

    case "run.started":
      return {
        ...state,
        runState: { type: "streaming" },
      };

    case "run.cancelling":
      return {
        ...state,
        runState: { type: "cancelling" },
      };

    case "run.reverting":
      return {
        ...state,
        runState: { type: "reverting" },
      };

    case "run.failed":
      return {
        ...state,
        runState: { type: "error", error: event.error },
      };

    case "session.updated":
      return {
        ...state,
        session: event.session,
        sync: {
          ...state.sync,
          lastEventAt: Date.now(),
        },
      };

    case "session.idle":
      return {
        ...state,
        runState: { type: "idle" },
        sync: {
          ...state.sync,
          lastEventAt: Date.now(),
        },
      };

    case "message.updated": {
      const pendingMatch =
        event.info.role === "user"
          ? findPendingMatchByMessageInfo(state, event.info)
          : undefined;

      let nextState = withMessage(state, event.info.id, (current) => ({
        id: event.info.id,
        info: event.info,
        parts: current?.parts ?? [],
        shadowParts:
          current?.shadowParts ??
          (pendingMatch && (current?.parts?.length ?? 0) === 0
            ? pendingMatch.parts
            : undefined),
      }));

      if (pendingMatch) {
        nextState = removePending(nextState, pendingMatch.clientId);
      }

      return {
        ...nextState,
        sync: {
          ...nextState.sync,
          lastEventAt: Date.now(),
        },
      };
    }

    case "message.removed": {
      if (!(event.messageId in state.messagesById)) return state;
      const messagesById = { ...state.messagesById };
      delete messagesById[event.messageId];
      return {
        ...state,
        messagesById,
        messageOrder: state.messageOrder.filter((id) => id !== event.messageId),
        sync: {
          ...state.sync,
          lastEventAt: Date.now(),
        },
      };
    }

    case "part.updated":
      return {
        ...withMessage(state, event.messageId, (current) => ({
          id: event.messageId,
          info: current?.info,
          parts: upsertMessagePart(current?.parts ?? [], event.part),
          shadowParts: current?.shadowParts,
        })),
        runState: { type: "streaming" },
        sync: {
          ...state.sync,
          lastEventAt: Date.now(),
        },
      };

    case "part.removed":
      return {
        ...withMessage(state, event.messageId, (current) => ({
          id: event.messageId,
          info: current?.info,
          parts: removeMessagePart(current?.parts ?? [], event.partId),
          shadowParts: current?.shadowParts,
        })),
        sync: {
          ...state.sync,
          lastEventAt: Date.now(),
        },
      };

    case "permission.asked":
      return {
        ...state,
        permissions: {
          ...state.permissions,
          pending: {
            ...state.permissions.pending,
            [event.request.id]: event.request,
          },
        },
        sync: {
          ...state.sync,
          lastEventAt: Date.now(),
        },
      };

    case "permission.replied": {
      const pending = { ...state.permissions.pending };
      delete pending[event.permissionId];
      return {
        ...state,
        permissions: {
          pending,
          resolved: {
            ...state.permissions.resolved,
            [event.permissionId]: {
              approved: event.approved,
              respondedAt: Date.now(),
            },
          },
        },
        sync: {
          ...state.sync,
          lastEventAt: Date.now(),
        },
      };
    }

    case "local.message.queued":
      return {
        ...state,
        pendingUserMessages: {
          ...state.pendingUserMessages,
          [event.pending.clientId]: event.pending,
        },
        runState: { type: "streaming" },
      };

    case "local.message.reconciled":
      return removePending(state, event.clientId);

    case "local.message.failed": {
      const pending = state.pendingUserMessages[event.clientId];
      if (!pending) return state;
      return {
        ...state,
        pendingUserMessages: {
          ...state.pendingUserMessages,
          [event.clientId]: {
            ...pending,
            status: "failed",
            error: event.error,
          },
        },
        runState: { type: "error", error: event.error },
      };
    }

    default:
      return state;
  }
};
