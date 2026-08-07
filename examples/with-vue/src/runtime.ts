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
      isRunning = false;
      sync();
    },
  });

  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const sync = () => core.setAdapter(makeAdapter());
  return new AssistantRuntimeImpl(core);
};
