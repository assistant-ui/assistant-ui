import type { AppendMessage, ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";

export type EchoMessage = { role: "user" | "assistant"; text: string };

const messageText = (message: AppendMessage) =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

export const createEchoRuntime = () => {
  let messages: EchoMessage[] = [];
  let isRunning = false;
  let replyTimer: ReturnType<typeof setTimeout> | undefined;

  const makeAdapter = (): ExternalStoreAdapter<EchoMessage> => ({
    messages,
    isRunning,
    convertMessage: (message) => ({
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    onNew: async (message) => {
      messages = [...messages, { role: "user", text: messageText(message) }];
      isRunning = true;
      sync();
      replyTimer = setTimeout(() => {
        messages = [
          ...messages,
          { role: "assistant", text: `Echo: ${messages.at(-1)!.text}` },
        ];
        isRunning = false;
        sync();
      }, 600);
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
