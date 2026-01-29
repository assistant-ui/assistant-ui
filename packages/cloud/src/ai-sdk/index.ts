/**
 * Lightweight AI SDK integration for Assistant Cloud.
 *
 * These hooks provide cloud persistence for AI SDK's `useChat` without
 * requiring the full assistant-ui runtime. Use these when:
 *
 * - Building completely custom UIs (not using assistant-ui components)
 * - Want minimal dependencies (just `assistant-cloud`, no `@assistant-ui/react`)
 * - Need direct control over the AI SDK chat state
 *
 * **For the full assistant-ui experience with AI SDK**, use `useChatRuntime`
 * from `@assistant-ui/react-ai-sdk` instead:
 *
 * ```tsx
 * import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
 * import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";
 * import { AssistantCloud } from "assistant-cloud";
 *
 * const cloud = new AssistantCloud({ baseUrl: "...", anonymous: true });
 *
 * function App() {
 *   const runtime = useChatRuntime({ cloud, api: "/api/chat" });
 *   return (
 *     <AssistantRuntimeProvider runtime={runtime}>
 *       <Thread />
 *     </AssistantRuntimeProvider>
 *   );
 * }
 * ```
 *
 * This gives you:
 * - Full thread list management with optimistic updates
 * - All assistant-ui primitives (Thread, Composer, Messages, etc.)
 * - Integrated title generation
 * - Unified state management
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
