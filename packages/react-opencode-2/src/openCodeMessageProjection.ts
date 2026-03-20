import type {
  AssistantMessage,
  Message,
  OpenCodeProjectedThreadMessage,
  OpenCodeServerMessage,
  OpenCodeThreadState,
  Part,
  PendingUserMessage,
} from "./types";

type ProjectedContentPart = Exclude<
  OpenCodeProjectedThreadMessage["content"],
  string
>[number];

const isAssistantMessage = (
  message: Message | undefined,
): message is AssistantMessage => {
  return message?.role === "assistant";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const mapToolState = (
  state: {
    status?: string;
    input?: unknown;
    output?: unknown;
    error?: unknown;
  } | null | undefined,
) => {
  const args = isRecord(state?.input) ? state.input : {};
  const argsText = JSON.stringify(args);

  if (state?.status === "completed") {
    return {
      args,
      argsText,
      result: state.output,
      isError: false,
    };
  }

  if (state?.status === "error") {
    return {
      args,
      argsText,
      result: state.error,
      isError: true,
    };
  }

  return {
    args,
    argsText,
    result: undefined,
    isError: false,
  };
};

const makeDataPart = (
  name: string,
  data: Record<string, unknown>,
  parentId?: string,
) => ({
  type: "data" as const,
  name,
  data,
  ...(parentId ? { parentId } : {}),
});

const sanitizeReasoningText = (text: string | undefined) =>
  (text ?? "").replaceAll("[REDACTED]", "").trim();

const convertFilePart = (part: Extract<Part, { type: "file" }>) => {
  const mimeType = part.mime ?? "application/octet-stream";
  if (mimeType.startsWith("image/")) {
    return {
      type: "image" as const,
      image: part.url ?? "",
      ...(part.filename ? { filename: part.filename } : {}),
    };
  }

  return {
    type: "file" as const,
    filename: part.filename ?? "file",
    data: part.url ?? "",
    mimeType,
  };
};

const projectAssistantContent = (
  message: OpenCodeServerMessage,
): ProjectedContentPart[] => {
  const content: ProjectedContentPart[] = [];
  const stepStack: string[] = [];

  const currentStepId = () => stepStack[stepStack.length - 1];

  for (const [index, part] of message.parts.entries()) {
    switch (part.type) {
      case "text":
        content.push({
          type: "text",
          text: part.text ?? "",
        });
        break;

      case "reasoning":
        {
          const text = sanitizeReasoningText(part.text);
          if (!text) break;
          content.push({
            type: "reasoning",
            text,
            ...(currentStepId() ? { parentId: currentStepId() } : {}),
          });
        }
        break;

      case "file":
        content.push(convertFilePart(part));
        break;

      case "tool": {
        const toolState = mapToolState(part.state);
        content.push({
          type: "tool-call",
          toolCallId: part.callID ?? part.id ?? `tool-${index}`,
          toolName: part.tool ?? "tool",
          args: toolState.args as never,
          argsText: toolState.argsText,
          ...(toolState.result !== undefined ? { result: toolState.result } : {}),
          ...(toolState.isError ? { isError: true } : {}),
          ...(currentStepId() ? { parentId: currentStepId() } : {}),
        });
        break;
      }

      case "step-start": {
        const nestedParentId = currentStepId();
        const stepId =
          ("id" in part && typeof part.id === "string" ? part.id : undefined) ??
          `step-${index}`;
        stepStack.push(stepId);
        content.push(
          makeDataPart(
            "opencode-step-start",
            {
              id: stepId,
              depth: stepStack.length - 1,
              snapshot:
                "snapshot" in part && typeof part.snapshot === "string"
                  ? part.snapshot
                  : undefined,
            },
            nestedParentId,
          ),
        );
        break;
      }

      case "step-finish": {
        const stepId =
          stepStack.pop() ??
          (("id" in part && typeof part.id === "string" ? part.id : undefined) ??
            `step-finish-${index}`);
        content.push(
          makeDataPart("opencode-step-finish", {
            id: stepId,
            reason: "reason" in part ? part.reason : undefined,
            cost: "cost" in part ? part.cost : undefined,
            snapshot:
              "snapshot" in part && typeof part.snapshot === "string"
                ? part.snapshot
                : undefined,
          }),
        );
        break;
      }

      case "patch":
        content.push(
          makeDataPart(
            "opencode-patch",
            {
              id:
                ("id" in part && typeof part.id === "string" ? part.id : undefined) ??
                `patch-${index}`,
              hash: "hash" in part ? part.hash : undefined,
              files: Array.isArray((part as { files?: unknown[] }).files)
                ? (part as { files: unknown[] }).files.filter(
                    (file): file is string => typeof file === "string",
                  )
                : [],
              part,
            },
            currentStepId(),
          ),
        );
        break;

      case "snapshot":
        content.push(
          makeDataPart(
            "opencode-snapshot",
            {
              id:
                ("id" in part && typeof part.id === "string" ? part.id : undefined) ??
                `snapshot-${index}`,
              part,
            },
            currentStepId(),
          ),
        );
        break;

      case "retry":
      case "compaction":
      case "agent":
      case "subtask":
        content.push(
          makeDataPart(
            `opencode-${part.type}`,
            {
              id:
                ("id" in part && typeof part.id === "string" ? part.id : undefined) ??
                `${part.type}-${index}`,
              part,
            },
            currentStepId(),
          ),
        );
        break;

      default:
        break;
    }
  }

  return content;
};

const projectUserContent = (
  message: OpenCodeServerMessage,
): ProjectedContentPart[] => {
  if (message.parts.length === 0) {
    return (message.shadowParts ?? []) as ProjectedContentPart[];
  }

  return message.parts.flatMap((part) => {
    switch (part.type) {
      case "text":
        return [{ type: "text" as const, text: part.text ?? "" }] satisfies ProjectedContentPart[];
      case "file":
        return [convertFilePart(part)] satisfies ProjectedContentPart[];
      default:
        return [] as ProjectedContentPart[];
    }
  });
};

const getMessageStatus = (
  message: OpenCodeServerMessage,
): OpenCodeProjectedThreadMessage["status"] => {
  if (!isAssistantMessage(message.info)) {
    return undefined;
  }

  if (message.info.error) {
    const error = message.info.error;
    const maybeMessage =
      "data" in error &&
      typeof error.data === "object" &&
      error.data &&
      "message" in error.data
        ? (error.data as { message?: string }).message
        : undefined;

    return {
      type: "incomplete",
      reason: "error",
      error: maybeMessage ?? error.name,
    };
  }

  if (!message.info.finish) {
    return {
      type: "running",
    };
  }

  return {
    type: "complete",
    reason: "stop",
  };
};

const mergeServerMessages = (
  messages: readonly OpenCodeServerMessage[],
): OpenCodeServerMessage[] => {
  const merged: OpenCodeServerMessage[] = [];

  for (const message of messages) {
    const previous = merged[merged.length - 1];

    if (
      previous?.info?.role === "assistant" &&
      message.info?.role === "assistant"
    ) {
      merged[merged.length - 1] = {
        id: message.id,
        info: message.info,
        parts: [...previous.parts, ...message.parts],
        shadowParts:
          previous.shadowParts || message.shadowParts
            ? [...(previous.shadowParts ?? []), ...(message.shadowParts ?? [])]
            : undefined,
      };
      continue;
    }

    merged.push(message);
  }

  return merged;
};

const projectServerMessage = (
  message: OpenCodeServerMessage,
): OpenCodeProjectedThreadMessage | null => {
  if (!message.info) return null;

  const metadata = {
    custom: {
      opencode: {
        originalMessage: message.info,
        parts: message.parts,
      },
    },
  };

  if (message.info.role === "assistant") {
    const assistantInfo = message.info as AssistantMessage;
    return {
      id: message.info.id,
      role: "assistant",
      createdAt: new Date(message.info.time?.created ?? Date.now()),
      content: projectAssistantContent(message),
      status: getMessageStatus(message),
      metadata: {
        custom: {
          ...metadata.custom,
          modelID: assistantInfo.modelID,
          providerID: assistantInfo.providerID,
          cost: assistantInfo.cost,
          tokens: assistantInfo.tokens,
          mode: assistantInfo.mode,
        },
      },
    };
  }

  if (message.info.role === "user") {
    return {
      id: message.info.id,
      role: "user",
      createdAt: new Date(message.info.time?.created ?? Date.now()),
      content: projectUserContent(message),
      attachments: [],
      metadata,
    };
  }

  return null;
};

const projectPendingMessage = (
  pending: PendingUserMessage,
): OpenCodeProjectedThreadMessage => ({
  id: `local:${pending.clientId}`,
  role: "user",
  createdAt: new Date(pending.createdAt),
  content: pending.parts as OpenCodeProjectedThreadMessage["content"],
  attachments: [],
  metadata: {
    custom: {
      opencode: {
        pending: true,
        clientId: pending.clientId,
        error:
          pending.status === "failed"
            ? pending.error instanceof Error
              ? pending.error.message
              : String(pending.error ?? "Failed to send message")
            : undefined,
      },
    },
  },
});

export const projectOpenCodeThreadMessages = (
  state: OpenCodeThreadState,
): OpenCodeProjectedThreadMessage[] => {
  const mergedServerMessages = mergeServerMessages(
    state.messageOrder.flatMap((messageId: string) => {
      const message = state.messagesById[messageId];
      return message ? [message] : [];
    }),
  );

  const serverMessages = mergedServerMessages
    .map((message) => projectServerMessage(message))
    .filter(
      (message): message is OpenCodeProjectedThreadMessage => message !== null,
    );

  const pendingMessages = (Object.values(
    state.pendingUserMessages,
  ) as PendingUserMessage[])
    .sort((left, right) => left.createdAt - right.createdAt)
    .map((pending) => projectPendingMessage(pending));

  return [...serverMessages, ...pendingMessages].sort((left, right) => {
    const leftTime =
      left.createdAt instanceof Date ? left.createdAt.getTime() : Date.now();
    const rightTime =
      right.createdAt instanceof Date ? right.createdAt.getTime() : Date.now();
    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.id?.localeCompare(right.id ?? "") ?? 0;
  });
};
