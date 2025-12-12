/**
 * Re-export ChatModelAdapter types from core.
 *
 * The adapter interface supports both Promise and AsyncGenerator return types
 * for flexible streaming implementations.
 */
export type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
} from "@assistant-ui/core";
