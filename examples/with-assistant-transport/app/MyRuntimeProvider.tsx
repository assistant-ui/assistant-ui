"use client";

import {
  AssistantRuntimeProvider,
  ThreadMessageLike,
  unstable_convertExternalMessages,
  AssistantTransportConnectionMetadata,
  makeAssistantTool,
} from "@assistant-ui/react";
import { useAssistantTransportRuntime } from "@assistant-ui/react";
import React, { ReactNode } from "react";
import { z } from "zod";

// Frontend tool with execute function
const WeatherTool = makeAssistantTool({
  type: "frontend",
  toolName: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({
    location: z.string().describe("The city to get weather for"),
    unit: z
      .enum(["celsius", "fahrenheit"])
      .optional()
      .describe("Temperature unit"),
  }),
  execute: async ({ location, unit = "celsius" }) => {
    console.log(`Getting weather for ${location} in ${unit}`);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const temp = Math.floor(Math.random() * 30) + 10;
    const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      location,
      temperature: temp,
      unit,
      condition,
      humidity: Math.floor(Math.random() * 40) + 40,
      windSpeed: Math.floor(Math.random() * 20) + 5,
    };
  },
  streamCall: async (reader) => {
    console.log("streamCall", reader);
    const city = await reader.args.get("location");
    console.log("location", city);

    const args = await reader.args.get();
    console.log("args", args);

    const result = await reader.response.get();
    console.log("result", result);
  },
});

type MyRuntimeProviderProps = {
  children: ReactNode;
};

type TextPart = {
  readonly type: "text";
  readonly text: string;
};

type ToolCallPart = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly argsText: string;
  readonly result: any;
};

type State = {
  messages: {
    role: "user" | "assistant";
    parts: (TextPart | ToolCallPart)[];
  }[];
};

const fromThreadMessageLike = (message: ThreadMessageLike, id: string) => {
  return unstable_convertExternalMessages(
    [message],
    (m) => ({
      ...m,
      id,
    }),
    false,
  )[0];
};

const converter = (
  state: State,
  connectionMetadata: AssistantTransportConnectionMetadata,
) => {
  const optimisticStateMessages = connectionMetadata.pendingCommands.map(
    (c) => {
      if (c.type === "add-message") {
        return [
          {
            role: "user" as const,
            parts: [
              {
                type: "text" as const,
                text: c.message.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("\n"),
              },
            ],
          },
        ];
      }
      return [];
    },
  );

  const messages = [...state.messages, ...optimisticStateMessages.flat()];

  return {
    messages:
      messages.map((m, idx) =>
        fromThreadMessageLike(
          {
            role: m.role,
            content: m.parts.map((p) => {
              switch (p.type) {
                case "text":
                  return { type: "text", text: p.text };
                case "tool-call":
                  return {
                    type: "tool-call",
                    toolCallId: p.toolCallId,
                    toolName: p.toolName,
                    argsText: p.argsText,
                    result: p.result,
                  };
              }
            }),
          },
          idx.toString(),
        ),
      ) || [],
    isRunning: connectionMetadata.isSending || false,
  };
};

export function MyRuntimeProvider({ children }: MyRuntimeProviderProps) {
  const runtime = useAssistantTransportRuntime({
    initialState: {
      messages: [],
    },
    api: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/assistant",
    converter,
    headers: async () => ({
      "Test-Header": "test-value",
    }),
    body: {
      "Test-Body": "test-value",
    },
    onResponse: () => {
      console.log("Response received from server");
    },
    onFinish: () => {
      console.log("Conversation completed");
    },
    onError: (error: Error) => {
      console.error("Assistant transport error:", error);
    },
    onCancel: () => {
      console.log("Request cancelled");
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <WeatherTool />

      {children}
    </AssistantRuntimeProvider>
  );
}
