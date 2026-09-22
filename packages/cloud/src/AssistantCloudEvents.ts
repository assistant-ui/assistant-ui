import type { AssistantCloudAPI } from "./AssistantCloudAPI";

export type AssistantCloudEventKind =
  | "message_sent"
  | "message_edited"
  | "run_stopped"
  | "message_regenerated"
  | "message_copied"
  | "branch_switched"
  | "suggestions_shown"
  | "suggestion_clicked"
  | "attachment_added"
  | "attachment_failed"
  | "thread_switched"
  | "tool_approved"
  | "tool_rejected"
  | "speech_started"
  | "voice_started"
  | "error_shown";

export type AssistantCloudEvent = {
  kind: AssistantCloudEventKind;
  thread_id?: string | undefined;
  message_id?: string | undefined;
  run_id?: string | undefined;
  value?: number | undefined;
  props?: Readonly<Record<string, string | number | boolean>> | undefined;
};

const FLUSH_SIZE = 20;
const MAX_BATCH_SIZE = 50;
const FLUSH_DELAY_MS = 2_000;
const RETRY_DELAYS_MS = [250, 1_000] as const;

export class AssistantCloudEvents {
  private buffer: AssistantCloudEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private flushing: Promise<void> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private resolveRetryDelay: (() => void) | undefined;
  private bestEffortRequested = false;

  private readonly cloud: AssistantCloudAPI;
  private readonly isEnabled: () => boolean;

  private listening = false;

  constructor(cloud: AssistantCloudAPI, isEnabled: () => boolean) {
    this.cloud = cloud;
    this.isEnabled = isEnabled;
  }

  public track(event: AssistantCloudEvent): void {
    if (!this.isEnabled()) return;

    this.listen();
    this.buffer.push(normalizeEvent(event));
    if (this.buffer.length >= FLUSH_SIZE) {
      void this.flush(true);
      return;
    }

    this.scheduleFlush();
  }

  private listen(): void {
    if (
      this.listening ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }
    this.listening = true;
    window.addEventListener("pagehide", this.flushBestEffort);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  private unlisten(): void {
    if (!this.listening) return;
    this.listening = false;
    window.removeEventListener("pagehide", this.flushBestEffort);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  public dispose(): void {
    this.unlisten();
    this.clearFlushTimer();
    void this.flushBestEffort();
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      void this.flushBestEffort();
    }
  };

  private flushBestEffort = () => {
    if (this.flushing) {
      this.bestEffortRequested = true;
      this.interruptRetryDelay();
    }
    return this.flush(false);
  };

  private flush = async (retryFailures: boolean): Promise<void> => {
    if (!this.isEnabled()) {
      this.buffer = [];
      this.clearFlushTimer();
      this.unlisten();
      return;
    }
    if (this.flushing) return this.flushing;

    this.clearFlushTimer();
    const task = this.flushPending(retryFailures);
    this.flushing = task;
    void task.then(() => {
      if (this.flushing !== task) return;
      this.flushing = undefined;
      this.bestEffortRequested = false;
      if (this.buffer.length === 0) {
        this.clearFlushTimer();
        this.unlisten();
      } else {
        void this.flush(true);
      }
    });
    return task;
  };

  private async flushPending(retryFailures: boolean): Promise<void> {
    while (this.buffer.length > 0) {
      if (!this.isEnabled()) {
        this.buffer = [];
        return;
      }

      const events = this.buffer.splice(0, MAX_BATCH_SIZE);
      for (let attempt = 0; ; attempt++) {
        try {
          await this.cloud.makeRequest("/events", {
            method: "POST",
            body: { events },
            keepalive: true,
          });
          break;
        } catch {
          const delay =
            retryFailures && !this.bestEffortRequested
              ? RETRY_DELAYS_MS[attempt]
              : undefined;
          if (delay === undefined) break;
          await this.waitForRetry(delay);
          if (!this.isEnabled()) {
            this.buffer = [];
            return;
          }
          if (this.bestEffortRequested) break;
        }
      }
    }
  }

  private waitForRetry(delay: number): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        this.retryTimer = undefined;
        this.resolveRetryDelay = undefined;
        resolve();
      };
      this.resolveRetryDelay = finish;
      this.retryTimer = setTimeout(finish, delay);
    });
  }

  private interruptRetryDelay(): void {
    if (this.retryTimer !== undefined) clearTimeout(this.retryTimer);
    this.resolveRetryDelay?.();
  }

  private scheduleFlush() {
    if (this.timer !== undefined) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush(true);
    }, FLUSH_DELAY_MS);
  }

  private clearFlushTimer() {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}

const normalizeEvent = (event: AssistantCloudEvent): AssistantCloudEvent => {
  const props = normalizeProps(event.props);
  return {
    kind: event.kind,
    ...(normalizeId(event.thread_id) ? { thread_id: event.thread_id } : {}),
    ...(normalizeId(event.message_id) ? { message_id: event.message_id } : {}),
    ...(normalizeId(event.run_id) ? { run_id: event.run_id } : {}),
    ...(isNonNegativeInteger(event.value) ? { value: event.value } : {}),
    ...(props ? { props } : {}),
  };
};

const normalizeId = (value: string | undefined): string | undefined =>
  value && value.length <= 48 ? value : undefined;

const isNonNegativeInteger = (value: number | undefined): value is number =>
  value !== undefined && Number.isInteger(value) && value >= 0;

const normalizeProps = (
  props: AssistantCloudEvent["props"],
): AssistantCloudEvent["props"] => {
  if (!props) return undefined;
  const entries = Object.entries(props);
  if (
    entries.some(
      ([, value]) =>
        (typeof value === "string" && value.length > 256) ||
        (typeof value === "number" && !Number.isFinite(value)) ||
        (typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean"),
    )
  ) {
    return undefined;
  }
  const value = Object.fromEntries(entries);
  return new TextEncoder().encode(JSON.stringify(value)).byteLength <= 1024
    ? value
    : undefined;
};
