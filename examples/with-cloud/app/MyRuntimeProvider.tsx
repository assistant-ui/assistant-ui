"use client";

import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
// import { useEdgeRuntime } from "@assistant-ui/react-edge";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
// CG TODO: cleanup this import
import {
  createToolbox,
  testTypes,
} from "@assistant-ui/react/model-context/tool";
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

// const toolbox = createToolbox<BackendTools>((tool) => {
//   tool.tool("test", {
//     parameters: z.object({
//       name: z.string(),
//     }),
//     execute: async (args) => {
//       return `Other: ${args.name}`;
//     },
//   });
// });
// .tool("test", {
//   parameters: z.object({
//     name: z.string(),
//   }),
//   execute: async (args) => {
//     return `Other: ${args.name}`;
//   },
// })
// .tool("weather", {
//   render: (args) => <div>Weather: {args.weather}</div>,
// });

// createToolbox((tool) => {
//   weather: tool.
// })

// const toolbox = createToolbox<BackendTools>((tool) => ({
//   weather: {
//     render: (args) => <div>Weather: {args.weather}</div>,
//   },
//   day: {
//     render: (args) => <div>Day: {args.day}</div>,
//   },
//   rain: {
//     render: (args) => <div>Rain: {args.rain}</div>,
//   },
//   test: tool({
//     type: "frontend",
//     description: "Test tool",
//     parameters: z.object({
//       name: z.string(),
//     }),
//     execute: async (args) => {
//       return `Other: ${args.name}`;
//     },
//   }),
// }));

// type Toolbox = typeof toolbox;

// type Test = Toolbox["test"];

// type a = Test["parameters"];

// const a = {} as a;

// a.name;

// console.log(toolbox);

testTypes<BackendTools>((t) => ({
  weather: true,
  day: true,
  rain: true,
  a: t({
    type: "frontend",
    parameters: z.object({
      name: z.string(),
    }),
    execute: async (args) => {
      return `Other: ${args.name}`;
    },
  }),
}));

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
