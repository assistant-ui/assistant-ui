# Add conversations that persist

The app currently has one in-memory conversation. In this step, a message
belongs to a named thread, the thread list selects it, and browser storage
restores it after a reload. This is real persistence for one browser profile;
it deliberately does not need sign-in, a database, or Assistant Cloud.

## Prepare

1. Finish Step 6 first. Send a message and, if using an OpenAI key, create a
   note so there is meaningful state to preserve.
2. Install the persistence stream helper:

   ```bash
   npm install assistant-stream
   ```

   Confirm `assistant-stream` appears in `package.json` before writing code.
3. Read `integrations/persistence/custom-adapter` and `ui/thread-list` with
   the docs tool. Inspect `with-custom-thread-list` for the relationship
   between `useRemoteThreadListRuntime`, a `RemoteThreadListAdapter`, and a
   thread history adapter.

## Store threads and histories in the browser

Create `lib/browser-thread-list-adapter.tsx`. This application-owned adapter
stores thread metadata under `generative-ui-course:threads` and each thread's
formatted history under `generative-ui-course:messages:<id>`.

```tsx
"use client";

import { createAssistantStream } from "assistant-stream";
import { type GenericThreadHistoryAdapter, type MessageFormatAdapter, type MessageStorageEntry, RuntimeAdapterProvider, type RemoteThreadListAdapter, type ThreadHistoryAdapter, useAui } from "@assistant-ui/react";
import { useMemo, type PropsWithChildren } from "react";

type StoredThread = { remoteId: string; status: "regular" | "archived"; title?: string };
type StoredFormattedMessage = MessageStorageEntry<Record<string, unknown>>;
type StoredFormattedRepository = { headId?: string | null; messages: StoredFormattedMessage[] };

const read = <T,>(key: string, fallback: T): T => { try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

function createHistoryProvider(prefix: string) {
  return function BrowserHistoryProvider({ children }: PropsWithChildren) {
    const aui = useAui();
    const history = useMemo<ThreadHistoryAdapter>(() => {
      const key = () => `${prefix}messages:${aui.threadListItem().getState().remoteId ?? "new"}`;
      return {
        load: async () => ({ messages: [] }),
        async append() {},
        withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>): GenericThreadHistoryAdapter<TMessage> {
          const loadFormatted = async () => {
            const stored = read<StoredFormattedRepository>(key(), { messages: [] });
            const messages = stored.messages.flatMap((entry) => entry.format === formatAdapter.format ? [formatAdapter.decode(entry as MessageStorageEntry<TStorageFormat>)] : []);
            return { ...(stored.headId !== undefined ? { headId: stored.headId } : undefined), messages };
          };
          return {
            load: loadFormatted,
            async append(item) {
              const stored = read<StoredFormattedRepository>(key(), { messages: [] });
              const id = formatAdapter.getId(item.message);
              const entry: MessageStorageEntry<TStorageFormat> = { id, parent_id: item.parentId, format: formatAdapter.format, content: formatAdapter.encode(item) };
              const index = stored.messages.findIndex((message) => message.id === id);
              const messages = [...stored.messages];
              if (index === -1) messages.push(entry); else messages[index] = entry;
              write(key(), { headId: id, messages });
            },
          };
        },
      };
    }, [aui]);
    return <RuntimeAdapterProvider adapters={{ history }}>{children}</RuntimeAdapterProvider>;
  };
}

export function createBrowserThreadListAdapter(prefix: string): RemoteThreadListAdapter {
  const threadsKey = `${prefix}threads`;
  const loadThreads = () => read<StoredThread[]>(threadsKey, []);
  const saveThreads = (threads: StoredThread[]) => write(threadsKey, threads);
  return {
    unstable_Provider: createHistoryProvider(prefix),
    async list() { return { threads: loadThreads() }; },
    async initialize(localId) { const threads = loadThreads(); if (!threads.some(({ remoteId }) => remoteId === localId)) saveThreads([{ remoteId: localId, status: "regular" }, ...threads]); return { remoteId: localId, externalId: undefined }; },
    async rename(remoteId, title) { saveThreads(loadThreads().map((thread) => thread.remoteId === remoteId ? { ...thread, title } : thread)); },
    async archive(remoteId) { saveThreads(loadThreads().map((thread) => thread.remoteId === remoteId ? { ...thread, status: "archived" } : thread)); },
    async unarchive(remoteId) { saveThreads(loadThreads().map((thread) => thread.remoteId === remoteId ? { ...thread, status: "regular" } : thread)); },
    async delete(remoteId) { saveThreads(loadThreads().filter((thread) => thread.remoteId !== remoteId)); window.localStorage.removeItem(`${prefix}messages:${remoteId}`); },
    async fetch(remoteId) { const thread = loadThreads().find((item) => item.remoteId === remoteId); if (!thread) throw new Error("Thread not found"); return thread; },
    async generateTitle(_remoteId, messages) { return createAssistantStream((controller) => { const first = messages.find(({ role }) => role === "user"); const title = first?.content.flatMap((part) => part.type === "text" ? [part.text] : []).join(" ").trim(); controller.appendText(title?.slice(0, 44) || "New Chat"); }); },
  };
}
```

## Wire the runtime and shell

Replace `components/runtime-provider.tsx`. Keep interactables enabled from Step
6, but wrap each chat runtime in `useRemoteThreadListRuntime`:

```tsx
"use client";

import { AssistantRuntimeProvider, unstable_Interactables, useAui, useRemoteThreadListRuntime } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo } from "react";
import { createBrowserThreadListAdapter } from "../lib/browser-thread-list-adapter";

export function RuntimeProvider({ api = "/api/chat", children }: Readonly<{ api?: string; children: React.ReactNode }>) {
  const adapter = useMemo(() => createBrowserThreadListAdapter("generative-ui-course:"), []);
  const transport = useMemo(() => new AssistantChatTransport({ api }), [api]);
  const runtime = useRemoteThreadListRuntime({ adapter, runtimeHook: function useCourseChatRuntime() { return useChatRuntime({ transport }); } });
  const aui = useAui({ unstable_interactables: unstable_Interactables() });
  return <AssistantRuntimeProvider aui={aui} runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
```

Create `components/assistant-ui/thread-list.tsx`:

```tsx
"use client";
import { ThreadListItemPrimitive, ThreadListPrimitive } from "@assistant-ui/react";
import { MessageSquare, Plus } from "lucide-react";
export function ThreadList() { return <ThreadListPrimitive.Root className="flex flex-col gap-1"><ThreadListNew /><ThreadListPrimitive.Items components={{ ThreadListItem }} /></ThreadListPrimitive.Root>; }
export function ThreadListNew() { return <ThreadListPrimitive.New className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"><Plus className="size-4" />New Chat</ThreadListPrimitive.New>; }
function ThreadListItem() { return <ThreadListItemPrimitive.Root className="rounded-lg data-[active]:bg-[var(--muted)]"><ThreadListItemPrimitive.Trigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"><MessageSquare className="size-4 shrink-0 text-[var(--muted-foreground)]" /><ThreadListItemPrimitive.Title fallback="New Chat" /></ThreadListItemPrimitive.Trigger></ThreadListItemPrimitive.Root>; }
```

Create `components/assistant-shell.tsx` and replace `app/page.tsx`:

```tsx
// components/assistant-shell.tsx
"use client";
import { Thread } from "./assistant-ui/thread";
import { ThreadList, ThreadListNew } from "./assistant-ui/thread-list";
export function AssistantShell() { return <main className="flex h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]"><aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--muted)]/30 p-3 md:block"><p className="px-2 py-3 text-sm font-semibold">Conversations</p><ThreadList /></aside><section className="flex min-w-0 flex-1 flex-col"><div className="border-b border-[var(--border)] p-2 md:hidden"><ThreadListNew /></div><div className="min-h-0 flex-1"><Thread /></div></section></main>; }

// app/page.tsx
import { AssistantShell } from "../components/assistant-shell";
import { ToolProvider } from "../components/tool-provider";
export default function Page() { return <ToolProvider><AssistantShell /></ToolProvider>; }
```

## Run and prove persistence

Run `npm run dev` and open the URL. Send a weather request in the first chat;
wait for its title to appear. Click **New Chat**, create a writing note or send
another distinct message, then switch between the two threads. Reload the page
and repeat the switch: each thread must retain its own correct history (and
interactable state when it was created with a model key).

If browser tools are unavailable, give these exact actions to the learner and
ask them to confirm the two titles and their post-reload histories. Explain that
clearing site data clears this local demo; a server-side adapter or Assistant
Cloud is the next production choice, not a course prerequisite.

## Checkpoint

Ask the learner to confirm they created two conversations, switched between
them, reloaded, and recovered both histories. Only then proceed to edit and
branch a response in Step 8.
