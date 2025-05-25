"use client";

import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
// import { useEdgeRuntime } from "@assistant-ui/react-edge";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
// CG TODO: cleanup this import
import { createToolbox } from "@assistant-ui/react/model-context/tool";
import type { BackendTools } from "./api/chat/route";
import { z } from "zod";

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

// const getUsersCity = {}; // define w frontend tool

// const toolbox = createToolbox<BackendTools>({
//   weather: true,
//   day: true,
//   rain: true,
//   // getCountry: {
//   //   type: "frontend",
//   //   parameters: {
//   //     type: "object",
//   //     properties: {
//   //       name: { type: "string" },
//   //     },
//   //   },
//   // }, // HITL
//   // userTimezone: {
//   //   type: "frontend",
//   //   parameters: z.undefined(),
//   //   execute: async () => {
//   //     return "Europe/Berlin";
//   //   },
//   //   render: (args) => <div>User timezone: {args}</div>,
//   //   // parameters: z.object({
//   //   //   timezone: z.string(),
//   //   // }),
//   // },
// });

// const toolbox2 = createToolbox<BackendTools>();
// .tool("weather", {
//   render: (args) => <div>Weather: {args}</div>,
// })
// .tool("other", {
//   type: "frontend",
//   parameters: z.object({
//     name: z.string(),
//   }),
//   execute: async (args) => {
//     return "Other";
//   },
// });

const toolbox = createToolbox<BackendTools>()
  .tool("test", {
    parameters: z.object({
      name: z.string(),
    }),
    execute: async (args) => {
      return `Other: ${args.name}`;
    },
  })
  .tool("weather", {
    render: (args) => <div>Weather: {args.weather}</div>,
  });

console.log(toolbox);

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
