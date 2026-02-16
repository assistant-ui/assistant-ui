// Re-export from @assistant-ui/core
export type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  ChatModelRunUpdate,
} from "@assistant-ui/core";

// React-specific (stay in react)
export { useLocalRuntime } from "./useLocalRuntime";

/**
 * @deprecated Use `useLocalRuntime` instead.
 */
export { useLocalRuntime as useLocalThreadRuntime } from "./useLocalRuntime";

export type { LocalRuntimeOptions } from "./LocalRuntimeOptions";
