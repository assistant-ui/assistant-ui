# Tap-Native Runtime Example

This example demonstrates the first tap-native runtime implementation for assistant-ui using `@assistant-ui/tap` and `@assistant-ui/store`.

## Features

- ✅ **ExternalThread**: Display messages from external state
- ✅ **InMemoryThreadList**: Simple thread list management
- ✅ **Reactive Updates**: State changes automatically update the UI
- ✅ **Type-Safe**: Full TypeScript support with client registry
- ✅ **No Backend**: Pure client-side implementation

## Getting Started

```bash
# From the monorepo root, install dependencies
pnpm install

# Navigate to this example
cd examples/with-tap-runtime

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the example.

## How It Works

### 1. Define Messages

```typescript
const messages: ExternalThreadMessage[] = [
  {
    id: "1",
    role: "user",
    content: [{ type: "text", text: "Hello!" }],
  },
  {
    id: "2",
    role: "assistant",
    content: [{ type: "text", text: "Hi there!" }],
  },
];
```

### 2. Create Runtime

```typescript
const aui = useAui({
  threads: InMemoryThreadList({
    thread: () => ExternalThread({ messages, isRunning: false }),
  }),
});
```

### 3. Provide to App

```typescript
<AuiProvider value={aui}>
  <Thread.Root>
    <Thread.Messages />
  </Thread.Root>
</AuiProvider>
```

## Architecture

```
┌─────────────────────────────────────┐
│  React State (messages, isRunning)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    useAui (tap-native runtime)      │
│  ┌───────────────────────────────┐  │
│  │  InMemoryThreadList           │  │
│  │    └─ ExternalThread          │  │
│  │         └─ MessageClient      │  │
│  │         └─ ComposerClient     │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Assistant UI Components        │
│    <Thread.Messages />              │
└─────────────────────────────────────┘
```

## Key Concepts

### ExternalThread

A client that accepts messages from external state:

```typescript
ExternalThread({
  messages: ExternalThreadMessage[],
  isRunning?: boolean
})
```

### InMemoryThreadList

A client that manages thread list state:

```typescript
InMemoryThreadList({
  thread: () => ResourceElement<ClientOutput<"thread">>
})
```

### Client Registry

Type-safe client definitions via module augmentation (defined in `@assistant-ui/react`):

```typescript
declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    threads: ThreadsClientSchema;
    thread: ThreadClientSchema;
    message: MessageClientSchema;
    // ...
  }
}
```

## Extending This Example

You can extend this example to:

1. **Add persistence**: Save messages to localStorage or a database
2. **Implement streaming**: Update messages as they stream in
3. **Add branching**: Allow users to explore different conversation paths
4. **Enable editing**: Let users edit messages
5. **Add attachments**: Support file uploads and images
6. **Connect to AI**: Integrate with OpenAI, Anthropic, or other AI providers

## Learn More

- [Tap Documentation](../../packages/tap/README.md)
- [Store Documentation](../../packages/store/README.md)
- [Client Implementation](../../packages/react/src/client/README.md)
- [Assistant UI Docs](https://assistant-ui.com)
