import type { OpencodeClient } from "@opencode-ai/sdk/v2/client";
import type { OpenCodeServerEvent } from "./types";

type Listener = (event: OpenCodeServerEvent) => void;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
};

const extractSessionId = (
  type: string,
  properties: Record<string, unknown>,
): string | undefined => {
  if (typeof properties.sessionID === "string") {
    return properties.sessionID;
  }

  const info = asRecord(properties.info);
  if (info) {
    if (typeof info.sessionID === "string") {
      return info.sessionID;
    }

    if (
      (type === "session.created" ||
        type === "session.updated" ||
        type === "session.deleted") &&
      typeof info.id === "string"
    ) {
      return info.id;
    }
  }

  const part = asRecord(properties.part);
  if (part && typeof part.sessionID === "string") {
    return part.sessionID;
  }

  return undefined;
};

const normalizeEventPayload = (event: unknown): OpenCodeServerEvent | null => {
  const outer = asRecord(event);
  if (!outer) return null;

  const payload = asRecord(outer.payload);
  const candidate = payload ?? outer;

  if (
    typeof candidate.type !== "string" ||
    !("properties" in candidate) ||
    !asRecord(candidate.properties)
  ) {
    return null;
  }

  const normalized = {
    type: candidate.type,
    properties: candidate.properties as Record<string, unknown>,
    sessionId: extractSessionId(
      candidate.type,
      candidate.properties as Record<string, unknown>,
    ),
    raw: event,
  } satisfies OpenCodeServerEvent;

  return normalized;
};

export class OpenCodeEventSource {
  private readonly listeners = new Set<Listener>();
  private readonly reconnectDelayMs = 1_000;
  private abortController: AbortController | null = null;
  private connectionPromise: Promise<void> | null = null;
  private stopped = false;

  constructor(private readonly client: OpencodeClient) {}

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    this.connect();

    return () => {
      this.listeners.delete(listener);
    };
  }

  public dispose() {
    this.stopped = true;
    this.abortController?.abort();
    this.abortController = null;
    this.connectionPromise = null;
  }

  private emit(event: OpenCodeServerEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private connect() {
    if (this.connectionPromise || this.stopped) return;
    this.connectionPromise = this.run();
  }

  private async run() {
    while (!this.stopped) {
      this.abortController = new AbortController();

      try {
        const subscription = await this.client.event.subscribe(undefined, {
          signal: this.abortController.signal,
        });

        for await (const event of subscription.stream) {
          if (this.abortController.signal.aborted || this.stopped) {
            return;
          }

          const normalized = normalizeEventPayload(event);
          if (!normalized) continue;
          this.emit(normalized);
        }
      } catch (error) {
        if (this.abortController?.signal.aborted || this.stopped) return;
        console.warn(
          "[react-opencode] OpenCode event stream disconnected",
          error,
        );
      } finally {
        this.abortController = null;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, this.reconnectDelayMs),
      );
    }
  }
}
