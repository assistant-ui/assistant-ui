"use client";

import {
  AssistantRuntimeProvider,
  makeAssistantTool,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { z } from "zod";

const MyToolUI = makeAssistantTool({
  toolName: "my_tool",
  parameters: z.object({
    name: z.string(),
    age: z.number(),
    nicknames: z.array(z.string()),
  }),
  streamCall: async (reader) => {
    reader.args.streamText("name").pipeTo(
      new WritableStream({
        write: (value) => console.log("NAME UPDATE", value),
      }),
    );

    const test = await reader.args.get("name");
    console.log(test);

    reader.args.streamValues("age").pipeTo(
      new WritableStream({
        write: (value) => console.log("AGE UPDATE", value),
      }),
    );

    const test2 = await reader.args.get("age");
    console.log(test2);

    for await (const nickname of reader.args.forEach("nicknames")) {
      console.log("NICKNAME", nickname);
    }

    console.log(await reader.response.get());
  },
  execute: () => {
    return "hi!";
  },
});

export const Assistant = () => {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh gap-x-2 px-4 py-4">
        <Thread />
        <MyToolUI />
      </div>
    </AssistantRuntimeProvider>
  );
};
