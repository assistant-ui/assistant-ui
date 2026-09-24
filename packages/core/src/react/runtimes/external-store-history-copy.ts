import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import { getThreadRuntimeCoreIsRunning } from "../../runtime/api/thread-runtime";
import type {
  ThreadRuntimeCore,
  Unstable_RecordToolInteractionOptions,
} from "../../runtime/interfaces/thread-runtime-core";
import { FALLBACK_ID_PREFIX } from "../../runtime/utils/external-store-message";
import {
  appendToolInteraction,
  readToolInteractionLog,
} from "../../runtime/utils/tool-interactions";
import type {
  ThreadMessage,
  Unstable_ToolInteractionLog,
} from "../../types/message";
import { isErrorMessageId } from "../../utils/id";

type Signature = string | ThreadMessage;

export class ExternalStoreHistoryCopy {
  private thread: ThreadRuntimeCore | undefined;
  private history: ThreadHistoryAdapter | undefined;
  private lastHistory: ThreadHistoryAdapter | undefined;
  private session = 0;
  private copied = new Map<string, Signature>();
  private failedIds = new Set<string>();
  private interactions = new Map<
    string,
    Map<string, Unstable_ToolInteractionLog>
  >();
  private overlaid = new WeakMap<
    ThreadMessage,
    {
      logs: Map<string, Unstable_ToolInteractionLog>;
      message: ThreadMessage;
    }
  >();
  private pending = false;
  private inFlight = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private waiters: {
    resolve: () => void;
    reject: (error: unknown) => void;
  }[] = [];
  private warned = false;

  private signature(message: ThreadMessage): Signature {
    try {
      return (
        JSON.stringify({
          role: message.role,
          content: message.content,
          status: message.role === "assistant" ? message.status : undefined,
          metadata: message.metadata,
        }) ?? message
      );
    } catch {
      return message;
    }
  }

  private branch(): ThreadMessage[] {
    return (this.thread?.messages ?? [])
      .filter(
        (message) =>
          !message.metadata.isOptimistic &&
          !message.id.startsWith(FALLBACK_ID_PREFIX) &&
          !isErrorMessageId(message.id) &&
          !(message.role === "assistant" && message.status.type === "running"),
      )
      .map((message) => {
        const logs = this.interactions.get(message.id);
        if (!logs) return message;
        const cached = this.overlaid.get(message);
        if (
          cached &&
          cached.logs.size === logs.size &&
          [...logs].every(([id, log]) => cached.logs.get(id) === log)
        ) {
          return cached.message;
        }
        const copy = {
          ...message,
          content: message.content.map((part) => {
            if (part.type !== "tool-call") return part;
            const log = logs.get(part.toolCallId);
            return log ? { ...part, unstable_interactions: log } : part;
          }),
        } as ThreadMessage;
        this.overlaid.set(message, { logs: new Map(logs), message: copy });
        return copy;
      });
  }

  private seed(): void {
    for (const message of this.branch()) {
      if (!this.copied.has(message.id) && !this.failedIds.has(message.id)) {
        this.copied.set(message.id, this.signature(message));
      }
    }
  }

  public attach(thread: ThreadRuntimeCore, history: ThreadHistoryAdapter) {
    if (history !== this.lastHistory) {
      this.copied.clear();
      this.failedIds.clear();
      this.interactions.clear();
      this.overlaid = new WeakMap();
      this.lastHistory = history;
      this.session += 1;
    }
    this.thread = thread;
    this.history = history;
    this.seed();
    const offStart = thread.unstable_on("runStart", () => this.seed());
    const offEnd = thread.unstable_on("runEnd", () => this.schedule());
    return () => {
      offStart();
      offEnd();
      if (this.timer !== undefined) clearTimeout(this.timer);
      this.timer = undefined;
      this.thread = undefined;
      this.history = undefined;
    };
  }

  public recordInteraction = async (
    options: Unstable_RecordToolInteractionOptions,
  ): Promise<void> => {
    const thread = this.thread;
    const message = thread?.messages.find(
      (item) => item.id === options.messageId,
    );
    const part = message?.content.find(
      (item) =>
        item.type === "tool-call" && item.toolCallId === options.toolCallId,
    );
    if (!thread || !message || part?.type !== "tool-call") {
      throw new Error("Tool call is not available.");
    }

    const isRunning = getThreadRuntimeCoreIsRunning(thread);
    if (!isRunning) this.seed();
    let logs = this.interactions.get(message.id);
    if (!logs) {
      logs = new Map();
      this.interactions.set(message.id, logs);
    }
    logs.set(
      options.toolCallId,
      appendToolInteraction(
        logs.get(options.toolCallId) ??
          readToolInteractionLog(part.unstable_interactions),
        options.interaction,
      ),
    );

    if (!isRunning) await this.schedule(true);
  };

  private schedule(wait = false): Promise<void> {
    this.pending = true;
    const result = wait
      ? new Promise<void>((resolve, reject) => {
          this.waiters.push({ resolve, reject });
        })
      : Promise.resolve();
    if (!this.inFlight && this.timer === undefined) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        void this.flush();
      }, 0);
    }
    return result;
  }

  private async flush(): Promise<void> {
    if (!this.pending || !this.history) return;
    const history = this.history;
    const session = this.session;
    this.pending = false;
    this.inFlight = true;
    const waiters = this.waiters.splice(0);
    const branch = this.branch();
    const changed = branch
      .map((message) => [message.id, this.signature(message)] as const)
      .filter(([id, signature]) => this.copied.get(id) !== signature);

    try {
      if (changed.length > 0) {
        await history.unstable_copy?.(
          branch,
          changed.map(([id]) => id),
        );
        if (session === this.session) {
          for (const [id, signature] of changed) {
            this.copied.set(id, signature);
            this.failedIds.delete(id);
          }
        }
      }
      for (const waiter of waiters) waiter.resolve();
    } catch (error) {
      if (session === this.session) {
        for (const [id] of changed) this.failedIds.add(id);
      }
      if (!this.warned) {
        this.warned = true;
        console.warn(
          "[useExternalStoreRuntime] Failed to copy history.",
          error,
        );
      }
      for (const waiter of waiters) waiter.reject(error);
    } finally {
      this.inFlight = false;
      if (this.pending) void this.schedule();
    }
  }
}
