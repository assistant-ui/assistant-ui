"use client";
import { WeatherSearchToolUI } from "@/components/tools/weather-tool";
import { GeocodeLocationToolUI } from "@/components/tools/weather-tool";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
  AssistantCloud,
} from "@assistant-ui/react";
// import {
//   type ChatModelAdapter,
//   type ChatModelRunOptions,
//   type ChatModelRunResult,
//   type ToolCallContentPart,
//   useLocalRuntime,
// } from "@assistant-ui/react";
// import { v4 as uuidv4 } from "uuid";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";


// async function* tokenByToken(str: string) {
//   for (const token of str.split(" ")) {
//     await new Promise((resolve) => setTimeout(resolve, Math.random() * 10 + 5));
//     yield token + " ";
//   }
// }

// const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

// class DummyChatAdapter implements ChatModelAdapter {
//   async *run({ messages }: ChatModelRunOptions) {
//     const lastMessage = messages[messages.length - 1];
//     if (
//       lastMessage &&
//       lastMessage.role === "user" &&
//       lastMessage.content[0]?.type === "text" &&
//       lastMessage.content[0].text.toLowerCase().includes("weather in tokyo")
//     ) {
//       // If the last message contains "tool", yield a tool_call example
//       const toolCallPart: ToolCallContentPart = {
//         type: "tool-call" as const,
//         toolCallId: `tool_${uuidv4()}`,
//         toolName: "web_search",
//         args: { query: "weather in Tokyo" },
//         argsText: JSON.stringify({ query: "weather in Tokyo" }),
//       };
//       const result: ChatModelRunResult = {
//         content: [toolCallPart],
//       };
//       yield result;
//       return; // End generation after yielding the tool call
//     }

//     // Original logic if the last message doesn't contain "tool"
//     const text =
//       messages.length === 1
//         ? `This is a mocked chat endpoint for testing purposes. Unique Message ID: ${uuidv4()}\n\n${LOREM_IPSUM}`
//         : `Unique Message ID: ${uuidv4()}\n\n${LOREM_IPSUM}`;
//     let output = "";

//     for await (const token of tokenByToken(text)) {
//       output += token;

//       yield {
//         content: [
//           {
//             type: "text" as const,
//             text: output,
//           },
//         ],
//       };
//     }
//   }
// }

export function DocsRuntimeProvider({ children }: { children: React.ReactNode }) {
  const assistantCloud = new AssistantCloud({
    baseUrl: process.env['NEXT_PUBLIC_ASSISTANT_BASE_URL']!,
    anonymous: true,
  });

  const runtime = useChatRuntime({
    api: "/api/chat",
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
      speech: new WebSpeechSynthesisAdapter(),
    },
    cloud: assistantCloud
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
      <WeatherSearchToolUI />
      <GeocodeLocationToolUI />
    </AssistantRuntimeProvider>
  );
}
