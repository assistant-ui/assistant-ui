/**
 * AI SDK hooks for Assistant Cloud persistence.
 *
 * - `useCloudChat` - Wraps AI SDK's `useChat` with automatic message persistence and thread management
 * - `useThreads` - Standalone thread list management with CRUD operations
 *
 * @module assistant-cloud/ai-sdk
 */

export {
  useCloudChat,
  type UseCloudChatResult,
  type UseCloudChatOptions,
} from "./useCloudChat";
export {
  useThreads,
  type UseThreadsResult,
  type UseThreadsOptions,
  type CloudThread,
  type ThreadStatus,
} from "./useThreads";
