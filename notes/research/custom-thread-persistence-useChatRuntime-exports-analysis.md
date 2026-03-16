---
date: 2025-10-01T17:30:00+00:00
researcher: Claude Code
git_commit: f04fe696
branch: main
repository: assistant-ui
topic: "Custom Thread Persistence with useChatRuntime - Export Analysis and Implementation Patterns"
tags: [research, codebase, react-ai-sdk, useChatRuntime, RemoteThreadListAdapter, thread-persistence, exports]
status: complete
last_updated: 2025-10-01
last_updated_by: Claude Code
---

# Research: Custom Thread Persistence with useChatRuntime - Export Analysis and Implementation Patterns

**Date**: 2025-10-01T17:30:00+00:00
**Researcher**: Claude Code
**Git Commit**: f04fe696
**Branch**: main
**Repository**: assistant-ui

## Research Question

A user is requesting to export `{UseChatRuntimeOptions, useChatThreadRuntime, type RemoteThreadListAdapter}` from `@assistant-ui/react-ai-sdk` or `@assistant-ui/react` to implement custom thread persistence while using the AI SDK integration. They want to understand if their approach of creating a custom version of `useChatRuntime` with a database adapter is reasonable and how to implement it.

## Summary

The user's approach is **correct and well-aligned** with the existing architecture. The codebase already demonstrates this pattern through the built-in `useChatRuntime` implementation, which combines AI SDK integration with remote thread persistence. However, the requested types are currently internal-only or have different export patterns than expected.

**Key Findings:**
- `UseChatRuntimeOptions` and `useChatThreadRuntime` exist but are not publicly exported
- `RemoteThreadListAdapter` exists in `@assistant-ui/react` with `unstable_` prefix
- The architecture already supports the exact pattern the user wants to implement
- Multiple implementation patterns exist for custom thread persistence with AI SDK

## Detailed Findings

### Current Export Status

#### UseChatRuntimeOptions
**Location**: [`packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.tsx:14-18`](https://github.com/samdickson22/assistant-ui/blob/f04fe696/packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.tsx#L14-L18)

```typescript
export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
  };
```

**Status**: ✅ **Defined and exported in source file** but ❌ **Not re-exported in main package index**

#### useChatThreadRuntime
**Location**: [`packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.tsx:20-70`](https://github.com/samdickson22/assistant-ui/blob/f04fe696/packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.tsx#L20-L70)

**Status**: ✅ **Defined and exported in source file** but ❌ **Not re-exported in main package index**

#### RemoteThreadListAdapter
**Location**: [`packages/react/src/legacy-runtime/runtime-cores/remote-thread-list/types.tsx:22-36`](https://github.com/samdickson22/assistant-ui/blob/f04fe696/packages/react/src/legacy-runtime/runtime-cores/remote-thread-list/types.tsx#L22-L36)

```typescript
export type RemoteThreadListAdapter = {
  list(): Promise<RemoteThreadListResponse>;
  rename(remoteId: string, newTitle: string): Promise<void>;
  archive(remoteId: string): Promise<void>;
  unarchive(remoteId: string): Promise<void>;
  delete(remoteId: string): Promise<void>;
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;
  generateTitle(
    remoteId: string,
    unstable_messages: readonly ThreadMessage[],
  ): Promise<AssistantStream>;
  unstable_Provider?: ComponentType<PropsWithChildren>;
};
```

**Status**: ✅ **Exported as `unstable_RemoteThreadListAdapter`** from `@assistant-ui/react`

### Built-in Implementation Pattern

The current `useChatRuntime` already implements the exact pattern the user wants:

**Location**: [`packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.tsx:72-83`](https://github.com/samdickson22/assistant-ui/blob/f04fe696/packages/react-ai-sdk/src/ui/use-chat/useChatRuntime.tsx#L72-L83)

```typescript
export const useChatRuntime = <UI_MESSAGE extends UIMessage = UIMessage>({
  cloud,
  ...options
}: UseChatRuntimeOptions<UI_MESSAGE> = {}): AssistantRuntime => {
  const cloudAdapter = unstable_useCloudThreadListAdapter({ cloud });
  return unstable_useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime(options);
    },
    adapter: cloudAdapter,
  });
};
```

This demonstrates:
1. ✅ **AI SDK integration** via `useChatThreadRuntime`
2. ✅ **Custom thread persistence** via `RemoteThreadListAdapter`
3. ✅ **Multi-thread support** via `unstable_useRemoteThreadListRuntime`

### Implementation Patterns for Custom Thread Persistence

#### Pattern 1: Custom useChatRuntime with Database Adapter

```typescript
import { unstable_useRemoteThreadListRuntime } from '@assistant-ui/react';
import { useChatThreadRuntime } from '@assistant-ui/react-ai-sdk/src/ui/use-chat/useChatRuntime';

// Implement your database adapter
const databaseAdapter: RemoteThreadListAdapter = {
  async list() {
    // Fetch threads from your database
    return { threads: [] };
  },
  async initialize(threadId) {
    // Initialize new thread in database
    return { remoteId: threadId };
  },
  // ... implement other methods
};

// Custom runtime hook
export const useCustomChatRuntime = (options) => {
  return unstable_useRemoteThreadListRuntime({
    runtimeHook: () => useChatThreadRuntime(options),
    adapter: databaseAdapter,
  });
};
```

#### Pattern 2: Thread History Adapter for Message Persistence

**Location**: [`packages/react/src/legacy-runtime/runtime-cores/adapters/thread-history/ThreadHistoryAdapter.ts:17-26`](https://github.com/samdickson22/assistant-ui/blob/f04fe696/packages/react/src/legacy-runtime/runtime-cores/adapters/thread-history/ThreadHistoryAdapter.ts#L17-L26)

```typescript
export type ThreadHistoryAdapter = {
  load(): Promise<ExportedMessageRepository & { unstable_resume?: boolean }>;
  resume?(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void, unknown>;
  append(item: ExportedMessageRepositoryItem): Promise<void>;
  withFormat?<TMessage, TStorageFormat>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage>;
};
```

**Implementation Example**:
```typescript
const databaseHistoryAdapter: ThreadHistoryAdapter = {
  async load() {
    // Load messages from database
    return { messages: [] };
  },
  async append(item) {
    // Save message to database
    await db.messages.create(item);
  }
};
```

#### Pattern 3: Complete Example with External Store

**Location**: [`examples/with-external-store/app/MyRuntimeProvider.tsx:20-47`](https://github.com/samdickson22/assistant-ui/blob/f04fe696/examples/with-external-store/app/MyRuntimeProvider.tsx#L20-L47)

```typescript
export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([]);

  const onNew = async (message: AppendMessage) => {
    // Save to database here
    const userMessage = { /* ... */ };
    await db.messages.save(userMessage);
    setMessages(prev => [...prev, userMessage]);

    // Get assistant response
    const assistantMessage = await getAssistantResponse(message);
    await db.messages.save(assistantMessage);
    setMessages(prev => [...prev, assistantMessage]);
  };

  const runtime = useExternalStoreRuntime({
    messages,
    setMessages,
    onNew,
    convertMessage,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### Architecture Insights

#### Two-Level Thread Management
1. **Thread List Level**: Manages metadata (create, rename, archive, delete threads)
2. **Thread Level**: Manages individual thread messages and state

#### Adapter Composition
```typescript
// Multiple adapters can be combined
const adapters = {
  history: databaseHistoryAdapter,    // Message persistence
  attachments: customAttachmentAdapter, // File handling
  // ... other adapters
};
```

#### Format Adapter Support
```typescript
// Supports custom message formats
const formatAdapter: MessageFormatAdapter<UIMessage, DatabaseFormat> = {
  encode: (message) => /* convert to database format */,
  decode: (dbMessage) => /* convert to UI format */,
};
```

## Recommended Solution

### For the User's Immediate Need

The user can implement their custom persistence **today** using existing exports:

```typescript
import { unstable_useRemoteThreadListRuntime, unstable_RemoteThreadListAdapter } from '@assistant-ui/react';
import { useChatThreadRuntime, type UseChatRuntimeOptions } from '@assistant-ui/react-ai-sdk/src/ui/use-chat/useChatRuntime';

// Custom database adapter
const myDatabaseAdapter: unstable_RemoteThreadListAdapter = {
  // ... implement database methods
};

// Custom runtime
export const useMyChatRuntime = (options?: UseChatRuntimeOptions) => {
  return unstable_useRemoteThreadListRuntime({
    runtimeHook: () => useChatThreadRuntime(options),
    adapter: myDatabaseAdapter,
  });
};
```

### Recommended Export Changes

**In `packages/react-ai-sdk/src/index.ts`:**
```typescript
export { useChatRuntime, useChatThreadRuntime } from './ui';
export type { UseChatRuntimeOptions } from './ui/use-chat/useChatRuntime';
```

**In `packages/react-ai-sdk/src/ui/index.ts`:**
```typescript
export { useChatRuntime, useChatThreadRuntime } from './use-chat/useChatRuntime';
export type { UseChatRuntimeOptions } from './use-chat/useChatRuntime';
```

## Historical Context

From the documentation and codebase structure:
- The architecture was designed specifically to support custom persistence patterns
- The `unstable_` prefixes indicate these are newer APIs still being finalized
- The AI SDK integration was built to be composable with custom adapters
- External store patterns provide maximum flexibility for custom implementations

## Related Research

- [External Store Runtime Example](examples/with-external-store/app/MyRuntimeProvider.tsx) - Complete custom persistence implementation
- [Cloud Thread History Adapter](packages/react/src/legacy-runtime/cloud/AssistantCloudThreadHistoryAdapter.tsx) - Production-grade persistence example
- [AI SDK Runtime with History](packages/react-ai-sdk/src/ui/use-chat/useAISDKRuntime.tsx) - AI SDK integration with custom history

## Open Questions

1. Should the `UseChatRuntimeOptions` type be made public to support custom runtime implementations?
2. Would users benefit from a documented pattern for custom database integration?
3. Should the `unstable_` prefixes be removed from these core APIs?
4. Could there be a higher-level abstraction that combines thread list and history adapters?

## Conclusion

The user's approach is architecturally sound and follows the existing patterns in the codebase. The main barrier is that some key types are not publicly exported, but this can be easily remedied. The architecture already supports the exact use case they're describing through the adapter pattern and composable runtime system.