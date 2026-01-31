"use client";

import { useState } from "react";
import {
  useAui,
  AuiProvider,
  useAuiState,
  ExternalThread,
  InMemoryThreadList,
  unstable_createMessageConverter,
  type ExternalThreadMessage,
  ThreadListPrimitive,
  ThreadListItemPrimitive,
} from "@assistant-ui/react";

type SimpleMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: { type: "complete"; reason: "stop" };
};

const converter = unstable_createMessageConverter<SimpleMessage>(
  (message: SimpleMessage) => ({
    role: message.role,
    content: message.content,
    id: message.id,
    status: message.status,
  }),
);

const SIMPLE_MESSAGES: SimpleMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Hello! What is tap-native runtime?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Hi! Tap-native runtime is a new way to build assistant-ui runtimes using @assistant-ui/tap and @assistant-ui/store. It provides:\n\n• Reactive state management with hooks-like API\n• Type-safe client definitions\n• Composable resource architecture\n• Minimal implementation for external state\n\nThis example demonstrates ExternalThread and InMemoryThreadList - the first tap-native runtime clients!",
    status: { type: "complete", reason: "stop" },
  },
  {
    id: "3",
    role: "user",
    content: "That sounds great! Can you show me an example?",
  },
  {
    id: "4",
    role: "assistant",
    content:
      'Sure! Here\'s how to use the tap-native runtime:\n\n```typescript\nconst messages = [\n  { id: "1", role: "user", content: [{ type: "text", text: "Hello!" }] }\n];\n\nconst aui = useAui({\n  threads: InMemoryThreadList({\n    thread: (threadId) => ExternalThread({ messages, isRunning: false })\n  }),\n  onSwitchToThread: (threadId) => console.log("Switched to", threadId)\n});\n```\n\nTry using the thread list on the left to create and switch between threads!',
    status: { type: "complete", reason: "stop" },
  },
];

export function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const [threadMessages, setThreadMessages] = useState<
    Map<string, SimpleMessage[]>
  >(() => new Map([["main", SIMPLE_MESSAGES]]));
  const [currentThreadId, setCurrentThreadId] = useState("main");
  const [isRunning, setIsRunning] = useState(false);

  const currentMessages = threadMessages.get(currentThreadId) || [];

  const handleSwitchToThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    setIsRunning(false);
  };

  const handleSwitchToNewThread = () => {
    const newId = `thread-${Date.now()}`;
    setThreadMessages((prev) => new Map(prev).set(newId, []));
    setCurrentThreadId(newId);
    setIsRunning(false);
  };

  const updateCurrentThreadMessages = (
    updater: (prev: SimpleMessage[]) => SimpleMessage[],
  ) => {
    setThreadMessages((prev) => {
      const newMap = new Map(prev);
      newMap.set(currentThreadId, updater(prev.get(currentThreadId) || []));
      return newMap;
    });
  };

  const messages = converter.useThreadMessages({
    messages: currentMessages,
    isRunning,
  }) as ExternalThreadMessage[];

  const aui = useAui({
    threads: InMemoryThreadList({
      thread: (threadId) =>
        ExternalThread({
          messages: threadId === currentThreadId ? messages : [],
          isRunning: threadId === currentThreadId ? isRunning : false,
          onNew: (message) => {
            console.log("New message:", message);
            const textContent = message.content
              .filter((part: any) => part.type === "text")
              .map((part: any) => part.text)
              .join("\n\n");

            updateCurrentThreadMessages((prev) => [
              ...prev,
              {
                id: String(Date.now()),
                role: message.role,
                content: textContent,
                ...(message.role === "assistant" && {
                  status: {
                    type: "complete" as const,
                    reason: "stop" as const,
                  },
                }),
              },
            ]);
          },
          onEdit: (message) => {
            console.log("Edit message:", message);
            updateCurrentThreadMessages((prev) => {
              const index = prev.findIndex((m) => m.id === message.sourceId);
              if (index === -1) return prev;

              const textContent = message.content
                .filter((part: any) => part.type === "text")
                .map((part: any) => part.text)
                .join("\n\n");

              const newMessages = [...prev];
              newMessages[index] = {
                ...newMessages[index]!,
                content: textContent,
              };
              return newMessages;
            });
          },
          onReload: (parentId) => {
            console.log("Reload from:", parentId);
            updateCurrentThreadMessages((prev) => {
              let cutMessages: SimpleMessage[];
              let sourceRole: "user" | "assistant" | "system" = "assistant";

              if (parentId === null) {
                cutMessages = [];
                sourceRole = prev[0]?.role || "assistant";
              } else {
                const parentIndex = prev.findIndex((m) => m.id === parentId);
                if (parentIndex === -1) {
                  cutMessages = [];
                  sourceRole = "assistant";
                } else {
                  cutMessages = prev.slice(0, parentIndex + 1);
                  const sourceMessage = prev[parentIndex + 1];
                  sourceRole = sourceMessage?.role || "assistant";
                }
              }

              const reloadMessage: SimpleMessage = {
                id: String(Date.now()),
                role: sourceRole,
                content: "This message was reloaded",
                ...(sourceRole === "assistant" && {
                  status: {
                    type: "complete" as const,
                    reason: "stop" as const,
                  },
                }),
              };

              return [...cutMessages, reloadMessage];
            });
          },
          onStartRun: () => {
            console.log("Start run");
            setIsRunning(true);
          },
          onCancel: () => {
            console.log("Cancel run");
            setIsRunning(false);
          },
        }),
      onSwitchToThread: handleSwitchToThread,
      onSwitchToNewThread: handleSwitchToNewThread,
    }),
  });

  return (
    <AuiProvider value={aui}>
      <div className="flex h-full">
        {/* Thread List Sidebar */}
        <ThreadListSidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {children}

          {/* Control panel */}
          <div className="border-t bg-card p-4">
            <div className="mx-auto flex max-w-2xl flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Controls:</span>
                <button
                  onClick={() => {
                    updateCurrentThreadMessages((prev) => [
                      ...prev,
                      {
                        id: String(Date.now()),
                        role: "user",
                        content: "New user message",
                      },
                    ]);
                  }}
                  className="rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                >
                  Add User Message
                </button>
                <button
                  onClick={() => {
                    updateCurrentThreadMessages((prev) => [
                      ...prev,
                      {
                        id: String(Date.now()),
                        role: "assistant",
                        content:
                          "New assistant message with some helpful information!",
                        status: { type: "complete", reason: "stop" },
                      },
                    ]);
                  }}
                  className="rounded-md bg-secondary px-3 py-1 font-medium text-secondary-foreground text-sm hover:bg-secondary/80"
                >
                  Add Assistant Message
                </button>
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="rounded-md bg-accent px-3 py-1 font-medium text-accent-foreground text-sm hover:bg-accent/80"
                >
                  {isRunning ? "Stop" : "Start"} Running
                </button>
                <button
                  onClick={() => updateCurrentThreadMessages(() => [])}
                  className="rounded-md bg-destructive px-3 py-1 font-medium text-sm text-white hover:bg-destructive/90"
                >
                  Clear
                </button>
              </div>
              <div className="text-muted-foreground text-xs">
                {currentMessages.length} message
                {currentMessages.length !== 1 ? "s" : ""} •{" "}
                {isRunning ? "Running" : "Idle"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuiProvider>
  );
}

function ThreadListSidebar() {
  return (
    <ThreadListPrimitive.Root className="flex w-64 flex-col border-r bg-muted/30">
      <div className="border-b p-4">
        <h2 className="font-semibold text-lg">Threads</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <ThreadListPrimitive.Items components={{ ThreadListItem }} />
      </div>

      <div className="border-t p-2">
        <ThreadListPrimitive.New className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90">
          + New Thread
        </ThreadListPrimitive.New>
      </div>
    </ThreadListPrimitive.Root>
  );
}

function ThreadListItem() {
  return (
    <ThreadListItemPrimitive.Root className="mb-1 w-full rounded-md p-3 text-left transition-colors hover:bg-muted data-active:bg-primary data-active:text-primary-foreground">
      <ThreadListItemPrimitive.Trigger className="w-full text-left">
        <div className="font-medium">
          <ThreadListItemPrimitive.Title fallback="New Thread" />
        </div>
        <div className="text-xs opacity-70">
          <ThreadListItemId />
        </div>
      </ThreadListItemPrimitive.Trigger>
    </ThreadListItemPrimitive.Root>
  );
}

function ThreadListItemId() {
  const id = useAuiState(({ threadListItem }) => threadListItem.id);
  return <>{id}</>;
}
