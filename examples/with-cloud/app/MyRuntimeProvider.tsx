"use client";

import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
// import { useEdgeRuntime } from "@assistant-ui/react-edge";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { createToolbox } from "@assistant-ui/react/model-context/tool";
import type { BackendTools } from "./api/chat/route";
import { z } from "zod";
import { frontendTool } from "assistant-stream/core/tool/tool-types";

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

const toolbox = createToolbox<BackendTools>()({
  hi: frontendTool({
    parameters: z.object({
      name: z.string(),
    }),
    execute: async (args) => {
      return `Other: ${args.name}`;
    },
    // CG TODO: Add disable frontend rendering.
  }),
  weather: {
    render: (args) => <div>Weather: {args.weather}</div>,
  },
  day: {
    render: (args) => <div>Day: {args.day}</div>,
  },
  rain: {
    render: (args) => <div>Rain: {args.rain}</div>,
  },
});

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useChatRuntime({
    cloud,
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
