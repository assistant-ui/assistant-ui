import type {
  AppendMessage,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
import type { OpencodeClient } from "@opencode-ai/sdk/client";
import {
  createOpenCodeThreadState,
  reduceOpenCodeThreadState,
} from "./openCodeThreadState";
import type {
  MessageWithParts,
  OpenCodePermissionRequest,
  OpenCodePermissionResponse,
  OpenCodeServerEvent,
  OpenCodeThreadControllerLike,
  OpenCodeThreadState,
  OpenCodeUserMessageOptions,
  PendingUserMessage,
} from "./types";
import { OpenCodeEventSource } from "./OpenCodeEventSource";

const createLocalId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const getTextContent = (parts: readonly ThreadUserMessagePart[]) =>
  parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "image") return part.filename ?? part.image;
      if (part.type === "file") return part.filename ?? part.data;
      if (part.type === "data") return JSON.stringify(part.data);
      if (part.type === "audio") return part.audio.data;
      return "";
    })
    .join("\n")
    .trim();

const getPromptParts = (message: AppendMessage) => {
    const content = [
      ...message.content,
      ...(message.attachments?.flatMap((attachment: any) => attachment.content ?? []) ??
        []),
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

const extractPermissionRequest = (
  event: OpenCodeServerEvent,
): OpenCodePermissionRequest | null => {
  const permissionID =
    typeof event.properties.permissionID === "string"
      ? event.properties.permissionID
      : typeof event.properties.id === "string"
        ? event.properties.id
        : undefined;

  const sessionId =
    event.sessionId ??
    (typeof event.properties.sessionID === "string"
      ? event.properties.sessionID
      : undefined);

  if (!permissionID || !sessionId) return null;

  const request: OpenCodePermissionRequest = {
    id: permissionID,
    sessionId,
    toolInput: event.properties.toolInput,
    askedAt: Date.now(),
  };

  if (typeof event.properties.toolName === "string") {
    request.toolName = event.properties.toolName;
  }

  if (typeof event.properties.title === "string") {
    request.title = event.properties.title;
  }

  if (
    typeof event.properties.metadata === "object" &&
    event.properties.metadata !== null
  ) {
    request.metadata = event.properties.metadata as Record<string, unknown>;
  }

  return request;
};

export class OpenCodeThreadController implements OpenCodeThreadControllerLike {
  private state: OpenCodeThreadState;
  private readonly listeners = new Set<() => void>();
  private readonly unsubscribeFromEvents: () => void;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private readonly client: OpencodeClient,
    private readonly eventSource: OpenCodeEventSource,
    private readonly baseUrl: string,
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

    this.loadPromise = Promise.all([
      this.client.session.get({ path: { id: this.sessionId } }),
      this.client.session.messages({ path: { id: this.sessionId } }),
    ])
      .then(([sessionResponse, messagesResponse]) => {
        this.dispatch({
          type: "history.loaded",
          session: sessionResponse.data ?? null,
          messages: ((messagesResponse.data ?? []) as MessageWithParts[]).slice(),
        });
      })
      .catch((error) => {
        this.dispatch({ type: "history.failed", error });
        throw error;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
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
      ...(message.attachments?.flatMap((attachment: any) => attachment.content ?? []) ??
        []),
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
      await this.client.session.prompt({
        path: { id: this.sessionId },
        body: {
          parts: getPromptParts(message),
          ...(options?.model ? { model: options.model } : {}),
          ...(options?.agent ? { agent: options.agent } : {}),
          ...(options?.noReply ? { noReply: options.noReply } : {}),
        } as never,
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
    await this.client.session.abort({
      path: { id: this.sessionId },
    });
  }

  public async revert(messageId: string) {
    this.dispatch({ type: "run.reverting" });
    await this.client.session.revert({
      path: { id: this.sessionId },
      body: { messageID: messageId } as never,
    });
  }

  public async unrevert() {
    await this.client.session.unrevert({
      path: { id: this.sessionId },
    });
  }

  public async fork(messageId: string) {
    const response = await this.client.session.fork({
      path: { id: this.sessionId },
      body: { messageID: messageId } as never,
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
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}/session/${this.sessionId}/permissions/${permissionId}`;
    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ response }),
    });

    if (!result.ok) {
      throw new Error(`Failed to reply to permission: ${result.status}`);
    }

    this.dispatch({
      type: "permission.replied",
      permissionId,
      approved: response !== "reject",
    });
  }

  private handleServerEvent(event: OpenCodeServerEvent) {
    switch (event.type) {
      case "session.updated": {
        const session = event.properties.info ?? event.properties.session;
        if (session && typeof session === "object") {
          this.dispatch({
            type: "session.updated",
            session: session as never,
          });
        }
        return;
      }

      case "session.idle":
        this.dispatch({ type: "session.idle", sessionId: this.sessionId });
        return;

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
          typeof event.properties.messageID === "string"
            ? event.properties.messageID
            : part &&
                typeof part === "object" &&
                "messageID" in part &&
                typeof part.messageID === "string"
              ? part.messageID
              : undefined;

        if (messageId && part && typeof part === "object") {
          this.dispatch({
            type: "part.updated",
            messageId,
            part: part as never,
          });
        }
        return;
      }

      case "message.part.removed":
        if (
          typeof event.properties.messageID === "string" &&
          typeof event.properties.partID === "string"
        ) {
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
        if (typeof event.properties.permissionID === "string") {
          this.dispatch({
            type: "permission.replied",
            permissionId: event.properties.permissionID,
            approved: Boolean(event.properties.approved),
          });
        }
        return;

      default:
        return;
    }
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
