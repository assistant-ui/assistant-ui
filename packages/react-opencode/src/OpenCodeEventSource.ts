import type { OpencodeClient } from "@opencode-ai/sdk/client";
import type { OpenCodeServerEvent } from "./types";

type Listener = (event: OpenCodeServerEvent) => void;

const extractSessionId = (event: OpenCodeServerEvent) => {
  if (typeof event.properties.sessionID === "string") {
    return event.properties.sessionID;
  }

  const info = event.properties.info;
  if (
    info &&
    typeof info === "object" &&
    "sessionID" in info &&
    typeof info.sessionID === "string"
  ) {
    return info.sessionID;
  }

  const part = event.properties.part;
  if (
    part &&
    typeof part === "object" &&
    "sessionID" in part &&
    typeof part.sessionID === "string"
  ) {
    return part.sessionID;
  }

  return undefined;
};

const normalizeEventPayload = (event: unknown): OpenCodeServerEvent | null => {
  if (!event || typeof event !== "object") return null;

  const wrappedPayload =
    "payload" in event && event.payload && typeof event.payload === "object"
      ? event.payload
      : null;

  const candidate =
    wrappedPayload && "type" in wrappedPayload && "properties" in wrappedPayload
      ? wrappedPayload
      : event;

  if (
    !candidate ||
    typeof candidate !== "object" ||
    !("type" in candidate) ||
    !("properties" in candidate) ||
    typeof candidate.type !== "string" ||
    typeof candidate.properties !== "object" ||
    candidate.properties == null
  ) {
    return null;
  }

  const normalized: OpenCodeServerEvent = {
    type: candidate.type,
    properties: candidate.properties as Record<string, unknown>,
    sessionId: undefined,
  };
  normalized.sessionId = extractSessionId(normalized);
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
        const subscription = await this.client.event.subscribe({
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
