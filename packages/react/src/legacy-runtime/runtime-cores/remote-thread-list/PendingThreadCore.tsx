import type { ThreadRuntimeCore } from "../../../internal";
import type { ThreadComposerRuntimeCore } from "../core/ComposerRuntimeCore";

type QueuedOperation =
  | { type: "append"; args: [unknown] }
  | { type: "composer.send" }
  | { type: "composer.addAttachment"; args: [unknown] };

/**
 * A buffering proxy for ThreadRuntimeCore that queues mutations during the
 * initialization window (before the real runtime is ready), then replays
 * them when the runtime arrives.
 *
 * This prevents the "This is the empty thread" error that users see when
 * interacting with the UI before the runtime has fully initialized.
 */
export class PendingThreadCore implements ThreadRuntimeCore {
  private _subscribers = new Set<() => void>();
  private _queue: QueuedOperation[] = [];
  private _resolved = false;
  private _resolvedRuntime?: ThreadRuntimeCore;

  // Buffered composer state is stored directly on the composer object
  // to avoid getter `this` binding issues in object literals.

  public resolve(runtime: ThreadRuntimeCore): void {
    if (this._resolved) return;
    this._resolved = true;
    this._resolvedRuntime = runtime;

    // Transfer buffered composer state to the real runtime
    const composerAny = this.composer as unknown as {
      text: string;
      role: string;
    };
    if (composerAny.text) {
      runtime.composer.setText(composerAny.text);
    }
    if (composerAny.role !== "user") {
      runtime.composer.setRole(composerAny.role as "user" | "assistant");
    }

    // Replay queued operations
    for (const op of this._queue) {
      switch (op.type) {
        case "append":
          runtime.append(op.args[0] as never);
          break;
        case "composer.send":
          runtime.composer.send();
          break;
        case "composer.addAttachment":
          runtime.composer.addAttachment(op.args[0] as never);
          break;
      }
    }
    this._queue = [];

    // Notify subscribers so the UI updates
    this._notifySubscribers();
  }

  private _notifySubscribers(): void {
    for (const cb of this._subscribers) {
      cb();
    }
  }

  // --- ThreadRuntimeCore read-only properties ---

  get messages() {
    return this._resolvedRuntime?.messages ?? [];
  }

  get isLoading() {
    return this._resolvedRuntime?.isLoading ?? false;
  }

  get isDisabled() {
    return this._resolvedRuntime?.isDisabled ?? false;
  }

  get capabilities() {
    return (
      this._resolvedRuntime?.capabilities ?? {
        switchToBranch: false,
        switchBranchDuringRun: false,
        edit: false,
        reload: false,
        cancel: false,
        unstable_copy: false,
        speech: false,
        dictation: false,
        attachments: false,
        feedback: false,
      }
    );
  }

  get speech() {
    return this._resolvedRuntime?.speech ?? undefined;
  }

  get state() {
    return this._resolvedRuntime?.state ?? null;
  }

  get suggestions() {
    return this._resolvedRuntime?.suggestions ?? [];
  }

  get extras() {
    return this._resolvedRuntime?.extras ?? undefined;
  }

  // --- ThreadRuntimeCore methods (delegate or buffer) ---

  getMessageById(messageId: string) {
    return this._resolvedRuntime?.getMessageById(messageId) ?? undefined;
  }

  getBranches(messageId: string) {
    return this._resolvedRuntime?.getBranches(messageId) ?? [];
  }

  switchToBranch(branchId: string): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.switchToBranch(branchId);
    }
    // No-op while pending (no branches exist yet)
  }

  append(message: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.append(message as never);
    } else {
      this._queue.push({ type: "append", args: [message] });
    }
  }

  startRun(config: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.startRun(config as never);
    }
    // No-op while pending (no messages to rerun)
  }

  resumeRun(config: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.resumeRun(config as never);
    }
  }

  cancelRun(): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.cancelRun();
    }
  }

  addToolResult(options: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.addToolResult(options as never);
    }
  }

  resumeToolCall(options: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.resumeToolCall(options as never);
    }
  }

  speak(messageId: string): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.speak(messageId);
    }
  }

  stopSpeaking(): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.stopSpeaking();
    }
  }

  submitFeedback(feedback: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.submitFeedback(feedback as never);
    }
  }

  getModelContext() {
    return this._resolvedRuntime?.getModelContext() ?? {};
  }

  getEditComposer(messageId: string) {
    return this._resolvedRuntime?.getEditComposer(messageId) ?? undefined;
  }

  beginEdit(messageId: string): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.beginEdit(messageId);
    }
  }

  unstable_loadExternalState(state: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.unstable_loadExternalState(state as never);
    }
  }

  import(repository: unknown): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.import(repository as never);
    }
  }

  export() {
    return this._resolvedRuntime?.export() ?? { messages: [] };
  }

  reset(): void {
    if (this._resolvedRuntime) {
      this._resolvedRuntime.reset();
    }
  }

  subscribe(callback: () => void) {
    this._subscribers.add(callback);
    // Also subscribe to the resolved runtime if available
    let runtimeUnsub: (() => void) | undefined;
    if (this._resolvedRuntime) {
      runtimeUnsub = this._resolvedRuntime.subscribe(callback);
    }
    return () => {
      this._subscribers.delete(callback);
      runtimeUnsub?.();
    };
  }

  unstable_on(event: string, callback: unknown) {
    if (this._resolvedRuntime) {
      return this._resolvedRuntime.unstable_on(
        event as never,
        callback as never,
      );
    }
    return () => {};
  }

  // --- Buffering Composer ---
  // Note: We avoid ES6 getters in object literals because `this` would refer
  // to the object literal, not the PendingThreadCore instance. Instead, we use
  // arrow functions that update mutable properties directly on the composer object.

  public composer: ThreadComposerRuntimeCore = this._createComposer();

  private _createComposer(): ThreadComposerRuntimeCore {
    const composer = {
      attachments: [] as unknown[],
      attachmentAccept: "*",
      text: "",
      isEmpty: true,
      isEditing: true,
      canCancel: false,
      role: "user" as "user" | "assistant",
      runConfig: {} as Record<string, unknown>,
      dictation: undefined,

      addAttachment: async (attachment: unknown) => {
        if (this._resolvedRuntime) {
          return this._resolvedRuntime.composer.addAttachment(
            attachment as never,
          );
        }
        this._queue.push({
          type: "composer.addAttachment",
          args: [attachment],
        });
      },

      removeAttachment: async (attachmentId: unknown) => {
        if (this._resolvedRuntime) {
          return this._resolvedRuntime.composer.removeAttachment(
            attachmentId as never,
          );
        }
      },

      setText: (text: string) => {
        composer.text = text;
        composer.isEmpty = text === "";
        if (this._resolvedRuntime) {
          this._resolvedRuntime.composer.setText(text);
        }
        this._notifySubscribers();
      },

      setRole: (role: "user" | "assistant") => {
        composer.role = role;
        if (this._resolvedRuntime) {
          this._resolvedRuntime.composer.setRole(role);
        }
      },

      setRunConfig: (config: unknown) => {
        composer.runConfig = config as Record<string, unknown>;
        if (this._resolvedRuntime) {
          this._resolvedRuntime.composer.setRunConfig(config as never);
        }
      },

      reset: async () => {
        composer.text = "";
        composer.isEmpty = true;
        composer.role = "user";
        composer.runConfig = {};
        if (this._resolvedRuntime) {
          return this._resolvedRuntime.composer.reset();
        }
      },

      clearAttachments: async () => {
        if (this._resolvedRuntime) {
          return this._resolvedRuntime.composer.clearAttachments();
        }
      },

      send: () => {
        if (this._resolvedRuntime) {
          this._resolvedRuntime.composer.send();
        } else {
          this._queue.push({ type: "composer.send" });
        }
      },

      cancel: () => {
        if (this._resolvedRuntime) {
          this._resolvedRuntime.composer.cancel();
        }
      },

      startDictation: () => {
        if (this._resolvedRuntime) {
          this._resolvedRuntime.composer.startDictation();
        }
      },

      stopDictation: () => {
        if (this._resolvedRuntime) {
          this._resolvedRuntime.composer.stopDictation();
        }
      },

      subscribe: (callback: () => void) => {
        this._subscribers.add(callback);
        let runtimeUnsub: (() => void) | undefined;
        if (this._resolvedRuntime) {
          runtimeUnsub = this._resolvedRuntime.composer.subscribe(callback);
        }
        return () => {
          this._subscribers.delete(callback);
          runtimeUnsub?.();
        };
      },

      unstable_on: (event: never, callback: never) => {
        if (this._resolvedRuntime) {
          return this._resolvedRuntime.composer.unstable_on(event, callback);
        }
        return () => {};
      },
    };
    return composer as unknown as ThreadComposerRuntimeCore;
  }
}
