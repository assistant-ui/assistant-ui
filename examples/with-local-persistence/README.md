# With Local Thread Persistence

This example demonstrates how to persist an **assistant-ui thread** in the browser using the built-in  
`useLocalThreadPersistence` hook.

The goal of this example is to show how to:

- keep the active assistant thread across page reloads
- avoid setting up a backend or database
- use `assistant-ui`’s local runtime with minimal configuration
- remain fully opt-in and explicit about persistence

---

## What This Example Demonstrates

This example uses:

- **`useLocalRuntime`** — an in-memory runtime
- **`useLocalThreadPersistence`** — a lightweight browser persistence hook
- **`localStorage`** — as the persistence backend
- **Next.js (App Router)** — for a realistic client setup

When you reload the page:
- the current thread is restored
- messages reappear immediately
- the runtime starts in a clean, idle state

---

## What This Example Does *Not* Do

This example intentionally does **not** include:

- multi-thread persistence
- thread list or archive persistence
- IndexedDB
- migrations or versioning
- backend storage
- AI SDK–based runtimes

Those are outside the scope of this example and are better handled by an  
`ExternalStoreRuntime`.

---

## Why This Example Exists

By default, `useLocalRuntime` is **fully in-memory**.

That means:
- refreshing the page clears all messages
- demos and prototypes feel fragile
- onboarding experiences are harder to build

This example shows how to fill that gap **without changing core runtime behavior**.

---

## Key Concept: Opt-In Persistence

Persistence in assistant-ui is **never implicit**.

This example opts in explicitly by calling:

```ts
useLocalThreadPersistence(runtime);

//example 

"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useLocalThreadPersistence,
} from "@assistant-ui/react";
import { useLocalRuntime } from "@assistant-ui/react";

export default function Page() {
  const runtime = useLocalRuntime(/* adapter */);

  useLocalThreadPersistence(runtime, {
    key: "assistant-ui:with-local-persistence",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
