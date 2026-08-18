const SILENT_RUNTIME_ACTION = Symbol.for("assistant-ui.silent-runtime-action");

export class ThreadListAdapterChangedError extends Error {
  readonly [SILENT_RUNTIME_ACTION] = true;

  constructor() {
    super("Thread list adapter changed while an operation was pending.");
    this.name = "ThreadListAdapterChangedError";
  }
}

export const isSilentRuntimeAction = (error: unknown): boolean =>
  typeof error === "object" && error !== null && SILENT_RUNTIME_ACTION in error;
