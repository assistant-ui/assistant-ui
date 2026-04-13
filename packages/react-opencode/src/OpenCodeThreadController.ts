import type { AppendMessage, ThreadUserMessagePart } from "@assistant-ui/react";
import type {
  OpencodeClient,
  PermissionRequest,
  SessionStatus,
} from "@opencode-ai/sdk/v2/client";
import {
  createOpenCodeThreadState,
  reduceOpenCodeThreadState,
} from "./openCodeThreadState";
import type {
  MessageWithParts,
  OpenCodePermissionRequest,
  OpenCodePermissionResponse,
  OpenCodeQuestionRequest,
  QuestionAnswer,
  OpenCodeServerEvent,
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
  OpenCodeUnhandledEvent,
  OpenCodeUserMessageOptions,
  PendingUserMessage,
} from "./types";
import type { OpenCodeEventSource } from "./OpenCodeEventSource";
import { serializeUserParts } from "./serializeUserParts";

const createLocalId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const getTextContent = (parts: readonly ThreadUserMessagePart[]) =>
  serializeUserParts(parts).trim();

const getPromptParts = (message: AppendMessage) => {
  const content = [
    ...message.content,
    ...(message.attachments?.flatMap(
      (attachment: any) => attachment.content ?? [],
    ) ?? []),
  ];

  const promptParts: Array<Record<string, unknown>> = [];
  for (const part of content) {
    if (part.type === "text") {
      promptParts.push({ type: "text", text: part.text });
      continue;
    }

    if (part.type === "image") {
      promptParts.push({ type: "image", image: part.image });
      continue;
    }

    if (part.type === "file") {
      promptParts.push({
        type: "file",
        filename: part.filename,
        mime: part.mimeType,
        url: part.data,
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

const extractPermissionRequest = (
  event: OpenCodeServerEvent,
): OpenCodePermissionRequest | null => {
  const request = event.properties as PermissionRequest;
  if (typeof request.id !== "string" || typeof request.sessionID !== "string") {
    return null;
  }

  const metadata =
    typeof request.metadata === "object" && request.metadata !== null
      ? (request.metadata as Record<string, unknown>)
      : {};

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

  return {
    id: request.id,
    sessionId: request.sessionID,
    permission: request.permission,
    patterns: request.patterns,
    metadata,
    always: request.always,
    tool: request.tool,
    toolName:
      typeof toolNameValue === "string" ? toolNameValue : request.permission,
    toolInput: toolInputValue,
    title: typeof titleValue === "string" ? titleValue : undefined,
    askedAt: Date.now(),
    raw: request,
  };
};

const extractQuestionRequest = (
  event: OpenCodeServerEvent,
): OpenCodeQuestionRequest | null => {
  const request = event.properties;
  if (typeof request.id !== "string" || typeof request.sessionID !== "string") {
    return null;
  }

  return {
    ...(request as OpenCodeQuestionRequest),
    askedAt: Date.now(),
  };
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

export class OpenCodeThreadController implements OpenCodeThreadControllerLike {
  private state: OpenCodeThreadState;
  private readonly listeners = new Set<() => void>();
  private readonly unsubscribeFromEvents: () => void;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private readonly client: OpencodeClient,
    private readonly eventSource: OpenCodeEventSource,
    private readonly sessionId: string,
  ) {
    this.state = createOpenCodeThreadState(sessionId);
    this.unsubscribeFromEvents = this.eventSource.subscribe((event) => {
      if (event.sessionId !== sessionId) return;
      this.handleServerEvent(event);
    });
  }

  public dispose() {
    this.unsubscribeFromEvents();
    this.listeners.clear();
  }

  public getState() {
    return this.state;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async load(force = false) {
    if (this.loadPromise && !force) return this.loadPromise;

    this.dispatch({ type: "history.loading" });

    const request = Promise.all([
      this.client.session.get({ sessionID: this.sessionId }),
      this.client.session.messages({ sessionID: this.sessionId }),
    ])
      .then(([sessionResponse, messagesResponse]) => {
        if (this.loadPromise !== request) return;
        this.dispatch({
          type: "history.loaded",
          session: sessionResponse.data ?? null,
          messages: (
            (messagesResponse.data ?? []) as MessageWithParts[]
          ).slice(),
        });
      })
      .catch((error) => {
        if (this.loadPromise !== request) throw error;
        this.dispatch({ type: "history.failed", error });
        throw error;
      })
      .finally(() => {
        if (this.loadPromise === request) {
          this.loadPromise = null;
        }
      });

    this.loadPromise = request;
    return request;
  }

  public refresh() {
    return this.load(true);
  }

  public async sendMessage(
    message: AppendMessage,
    options?: OpenCodeUserMessageOptions,
  ) {
    if (message.role !== "user") {
      throw new Error("OpenCode only supports sending user messages");
    }

    const parts = [
      ...message.content,
      ...(message.attachments?.flatMap(
        (attachment: any) => attachment.content ?? [],
      ) ?? []),
    ] as readonly ThreadUserMessagePart[];

    const pending: PendingUserMessage = {
      clientId: createLocalId("local"),
      sessionId: this.sessionId,
      createdAt: Date.now(),
      parentId: message.parentId,
      sourceId: message.sourceId,
      runConfig: message.runConfig,
      parts,
      contentText: getTextContent(parts),
      status: "pending",
    };

    this.dispatch({ type: "local.message.queued", pending });
    this.dispatch({ type: "run.started" });

    try {
      await this.client.session.promptAsync({
        sessionID: this.sessionId,
        // The SDK currently infers a narrower payload shape than the runtime
        // accepts here, so we cast at the boundary instead of widening types
        // throughout the caller stack.
        parts: getPromptParts(message) as never,
        ...(options?.model ? { model: options.model } : {}),
        ...(options?.agent ? { agent: options.agent } : {}),
        ...(options?.noReply ? { noReply: options.noReply } : {}),
      });
    } catch (error) {
      this.dispatch({
        type: "local.message.failed",
        clientId: pending.clientId,
        error,
      });
      throw error;
    }
  }

  public async cancel() {
    this.dispatch({ type: "run.cancelling" });
    try {
      await this.client.session.abort({
        sessionID: this.sessionId,
      });
    } catch (error) {
      this.dispatch({ type: "run.failed", error });
      throw error;
    }
  }

  public async revert(messageId: string) {
    this.dispatch({ type: "run.reverting" });
    try {
      await this.client.session.revert({
        sessionID: this.sessionId,
        messageID: messageId,
      });
    } catch (error) {
      this.dispatch({ type: "run.failed", error });
      throw error;
    }
  }

  public async unrevert() {
    await this.client.session.unrevert({
      sessionID: this.sessionId,
    });
  }

  public async fork(messageId: string) {
    const response = await this.client.session.fork({
      sessionID: this.sessionId,
      messageID: messageId,
    });
    if (!response.data?.id) {
      throw new Error("Failed to fork OpenCode session");
    }
    return response.data.id;
  }

  public async replyToPermission(
    permissionId: string,
    response: OpenCodePermissionResponse,
  ) {
    await this.client.permission.reply({
      requestID: permissionId,
      reply: response,
    });

    this.dispatch({
      type: "permission.replied",
      permissionId,
      reply: response,
    });
  }

  public async replyToQuestion(
    questionId: string,
    answers: readonly QuestionAnswer[],
  ) {
    await this.client.question.reply({
      requestID: questionId,
      answers: answers.slice(),
    });

    this.dispatch({
      type: "question.replied",
      questionId,
      answers,
    });
  }

  public async rejectQuestion(questionId: string) {
    await this.client.question.reject({
      requestID: questionId,
    });

    this.dispatch({
      type: "question.rejected",
      questionId,
    });
  }

  private refreshInBackground() {
    void this.refresh().catch((error) => {
      this.dispatch({ type: "run.failed", error });
    });
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
        this.refreshInBackground();
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
          if (!(messageId in this.state.messagesById)) {
            this.refreshInBackground();
            return;
          }

          this.dispatch({
            type: "part.updated",
            messageId,
            part: part as never,
          });
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

          if (isSupportedDelta(this.state, messageID, partID, field)) {
            this.dispatch({
              type: "part.delta",
              messageId: messageID,
              partId: partID,
              field,
              delta,
            });
          } else {
            this.refreshInBackground();
          }
        }
        return;

      case "message.part.removed":
        if (
          typeof event.properties.messageID === "string" &&
          typeof event.properties.partID === "string"
        ) {
          if (!(event.properties.messageID in this.state.messagesById)) {
            this.refreshInBackground();
            return;
          }

          this.dispatch({
            type: "part.removed",
            messageId: event.properties.messageID,
            partId: event.properties.partID,
          });
        }
        return;

      case "permission.asked": {
        const request = extractPermissionRequest(event);
        if (request) {
          this.dispatch({
            type: "permission.asked",
            request,
          });
        }
        return;
      }

      case "permission.replied":
        if (
          typeof event.properties.requestID === "string" &&
          (event.properties.reply === "once" ||
            event.properties.reply === "always" ||
            event.properties.reply === "reject")
        ) {
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
          this.dispatch({
            type: "question.asked",
            request,
          });
        }
        return;
      }

      case "question.replied":
        if (
          typeof event.properties.requestID === "string" &&
          Array.isArray(event.properties.answers)
        ) {
          this.dispatch({
            type: "question.replied",
            questionId: event.properties.requestID,
            answers: event.properties.answers as never,
          });
        }
        return;

      case "question.rejected":
        if (typeof event.properties.requestID === "string") {
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

  private dispatch(event: Parameters<typeof reduceOpenCodeThreadState>[1]) {
    const nextState = reduceOpenCodeThreadState(this.state, event);
    if (nextState === this.state) return;
    this.state = nextState;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
