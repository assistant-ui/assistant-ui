import type { AppendMessage, ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";

export type EchoMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type EchoThread = {
  id: string;
  title: string;
  messages: EchoMessage[];
};

let nextId = 0;
const freshId = (prefix: string) => `${prefix}-${nextId++}`;

const messageText = (message: AppendMessage) =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

const convertEchoMessage = (message: EchoMessage) => ({
  id: message.id,
  role: message.role,
  content: [{ type: "text" as const, text: message.text }],
});

export const createEchoRuntime = () => {
  let threads: EchoThread[] = [
    { id: freshId("thread"), title: "", messages: [] },
  ];
  let currentId = threads[0]!.id;
  let isRunning = false;
  let replyTimer: ReturnType<typeof setTimeout> | undefined;

  const current = () => threads.find((thread) => thread.id === currentId)!;
  const updateCurrent = (updater: (thread: EchoThread) => EchoThread) => {
    threads = threads.map((thread) =>
      thread.id === currentId ? updater(thread) : thread,
    );
  };

  const reply = (text: string) => {
    const replyTo = currentId;
    isRunning = true;
    sync();
    replyTimer = setTimeout(() => {
      if (currentId !== replyTo) return;
      updateCurrent((thread) => ({
        ...thread,
        messages: [
          ...thread.messages,
          {
            id: freshId("assistant"),
            role: "assistant",
            text: `Echo: ${text}`,
          },
        ],
      }));
      isRunning = false;
      sync();
    }, 600);
  };

  const appendUser = (text: string) => {
    updateCurrent((thread) => ({
      ...thread,
      title: thread.title || text.slice(0, 40),
      messages: [
        ...thread.messages,
        { id: freshId("user"), role: "user", text },
      ],
    }));
  };

  const makeAdapter = (): ExternalStoreAdapter<EchoMessage> => ({
    messages: current().messages,
    isRunning,
    convertMessage: convertEchoMessage,
    setMessages: (next) => {
      updateCurrent((thread) => ({ ...thread, messages: next }));
      sync();
    },
    onNew: async (message) => {
      const text = messageText(message);
      appendUser(text);
      reply(text);
    },
    onEdit: async (message) => {
      const text = messageText(message);
      const parentIndex = message.parentId
        ? current().messages.findIndex(
            (entry) => entry.id === message.parentId,
          ) + 1
        : 0;
      updateCurrent((thread) => ({
        ...thread,
        messages: thread.messages.slice(0, parentIndex),
      }));
      appendUser(text);
      reply(text);
    },
    onReload: async (parentId) => {
      let parentIndex = 0;
      if (parentId) {
        const index = current().messages.findIndex(
          (entry) => entry.id === parentId,
        );
        if (index === -1) return;
        parentIndex = index + 1;
      }
      const sliced = current().messages.slice(0, parentIndex);
      const lastUser = [...sliced]
        .reverse()
        .find((entry) => entry.role === "user");
      updateCurrent((thread) => ({ ...thread, messages: sliced }));
      reply(`${lastUser?.text ?? ""} (again)`);
    },
    onCancel: async () => {
      clearTimeout(replyTimer);
      if (isRunning && current().messages.at(-1)?.role === "user") {
        updateCurrent((thread) => ({
          ...thread,
          messages: thread.messages.slice(0, -1),
        }));
      }
      isRunning = false;
      // cancelRun restores the trailing user message into the composer
      // synchronously after onCancel returns; an eager sync would delete it
      // before that restore reads it.
      queueMicrotask(sync);
    },
    adapters: {
      threadList: {
        threadId: currentId,
        threads: threads.map((thread) => ({
          status: "regular" as const,
          id: thread.id,
          title: thread.title,
        })),
        onSwitchToThread: (threadId) => {
          clearTimeout(replyTimer);
          isRunning = false;
          currentId = threadId;
          sync();
        },
        onSwitchToNewThread: () => {
          clearTimeout(replyTimer);
          isRunning = false;
          const id = freshId("thread");
          threads = [...threads, { id, title: "", messages: [] }];
          currentId = id;
          sync();
        },
      },
    },
  });

  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const sync = () => core.setAdapter(makeAdapter());
  return new AssistantRuntimeImpl(core);
};
