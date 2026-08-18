export const SILENT_RUNTIME_ACTION = Symbol.for(
  "assistant-ui.silent-runtime-action",
);

export const isSilentRuntimeAction = (error: unknown): boolean =>
  typeof error === "object" && error !== null && SILENT_RUNTIME_ACTION in error;
