"use agent";

import { useModel, useTool } from "@flue/runtime";
import * as v from "valibot";

const model = process.env["MODEL_SPECIFIER"] ?? "openai/gpt-4o-mini";

export function ChatAgent() {
  useModel(model);

  useTool({
    name: "get_integration_details",
    description:
      "Inspect how the current assistant-ui and Flue chat is connected. Use this when the user asks about the integration, durability, or runtime setup.",
    input: v.object({}),
    run() {
      return {
        output: {
          model,
          client: "@assistant-ui/react-flue",
          transport: "Flue conversation HTTP API",
          durability: "Conversation history is persisted by Flue",
          attachments: "Base64 image attachments",
        },
      };
    },
  });

  return `You are the assistant in the assistant-ui and Flue example chat.

Be helpful, conversational, and concise. You can answer general questions and help users understand how to build durable AI applications with assistant-ui and Flue.

When the user asks how this chat is wired, about its runtime, or what survives a reload, call get_integration_details before answering. Explain that assistant-ui owns the interface, the @assistant-ui/react-flue adapter maps the conversation into assistant-ui messages, and Flue owns model execution and durable history. Never claim that an API key is sent to the browser.`;
}
