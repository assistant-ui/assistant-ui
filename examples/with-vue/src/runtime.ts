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
  let messages: EchoMessage[] = [];
  let isRunning = false;
  let replyTimer: ReturnType<typeof setTimeout> | undefined;

  const reply = (text: string) => {
    isRunning = true;
    sync();
    replyTimer = setTimeout(() => {
      messages = [
        ...messages,
        { id: freshId("assistant"), role: "assistant", text: `Echo: ${text}` },
      ];
      isRunning = false;
      sync();
    }, 600);
  };

  const makeAdapter = (): ExternalStoreAdapter<EchoMessage> => ({
    messages,
    isRunning,
    convertMessage: convertEchoMessage,
    setMessages: (next) => {
      messages = next;
      sync();
    },
    onNew: async (message) => {
      const text = messageText(message);
      messages = [...messages, { id: freshId("user"), role: "user", text }];
      reply(text);
    },
    onEdit: async (message) => {
      const text = messageText(message);
      const parentIndex = message.parentId
        ? messages.findIndex((entry) => entry.id === message.parentId) + 1
        : 0;
      messages = [
        ...messages.slice(0, parentIndex),
        { id: freshId("user"), role: "user", text },
      ];
      reply(text);
    },
    onReload: async (parentId) => {
      let parentIndex = 0;
      if (parentId) {
        const index = messages.findIndex((entry) => entry.id === parentId);
        if (index === -1) return;
        parentIndex = index + 1;
      }
      const sliced = messages.slice(0, parentIndex);
      const lastUser = [...sliced]
        .reverse()
        .find((entry) => entry.role === "user");
      messages = sliced;
      reply(`${lastUser?.text ?? ""} (again)`);
    },
    onCancel: async () => {
      clearTimeout(replyTimer);
      if (isRunning && messages.at(-1)?.role === "user") {
        messages = messages.slice(0, -1);
      }
      isRunning = false;
      // cancelRun restores the trailing user message into the composer
      // synchronously after onCancel returns; an eager sync would delete it
      // before that restore reads it.
      queueMicrotask(sync);
    },
  });

  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const sync = () => core.setAdapter(makeAdapter());
  return new AssistantRuntimeImpl(core);
};
