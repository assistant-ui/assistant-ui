"use client";

import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { createToolbox } from "@assistant-ui/react/model-context/tool";
import { z } from "zod";
import { frontendTool } from "assistant-stream/core/tool/tool-types";
import { BackendTools } from "./api/chat/route";
import { useEffect, useState } from "react";

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

export const toolbox = createToolbox<BackendTools>()({
  hi: frontendTool({
    name: "hi",
    parameters: z.object({
      name: z.string(),
    }),
    execute: async (args) => {
      return `Other: ${args.name}`;
    },

    render: function Render({ result }) {
      const [, setState] = useState(result);
      useEffect(() => {
        setState(result);
      }, [result]);
      return <div>Hi: {JSON.stringify(result)} confirmed</div>;
    },
  }),
  weather: {
    // render: ({ result }) => <div>Weather: {result?.weather}</div>,
    render: ({ result }) => <div>Weather: {result?.weather}</div>,
  },
  day: {
    render: ({ result }) => <div>Day: {result?.day}</div>,
  },
  rain: {
    render: ({ result }) => <div>Rain: {result?.rain}</div>,
  },
});

// toolbox
//   .useTool("weather")
//   .setUI(({ result }) => <div>Hi: {result?.weather}</div>);

//   toolbox
//   .useTool("hi")
//   .setUI(({ result }) => <div>Hi: {result}</div>);

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
    <AssistantRuntimeProvider runtime={runtime} toolbox={toolbox}>
      {children}
    </AssistantRuntimeProvider>
  );
}
