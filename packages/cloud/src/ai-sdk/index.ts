/**
 * AI SDK hooks for Assistant Cloud persistence.
 *
 * - `useCloudChat` - Wraps AI SDK's `useChat` with automatic message persistence and thread management
 * - `useThreads` - Thread list management with CRUD operations (used with `useCloudChat`)
 *
 * @module assistant-cloud/ai-sdk
 */

export { useCloudChat } from "./chat/useCloudChat";

export { useThreads } from "./threads/useThreads";

export type {
  UseCloudChatResult,
  UseCloudChatOptions,
  UseThreadsResult,
  UseThreadsOptions,
  CloudThread,
  ThreadStatus,
} from "./types";
