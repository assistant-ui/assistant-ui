"use client";

import { Claude } from "@/components/claude/Claude";
import { Shadcn } from "@/components/shadcn/Shadcn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VercelAIThreadProvider } from "@assistant-ui/react";
import { useChat } from "ai/react";
import Link from "next/link";
import React, { useState } from "react";
import { ChatGPT } from "../components/chatgpt/ChatGPT";

const supportedModels = [
  {
    name: "shadcn",
    component: Shadcn,
  },
  {
    name: "ChatGPT",
    component: ChatGPT,
  },
  {
    name: "Claude",
    component: Claude,
  },
];

export default function Home() {
  const chat = useChat();

  const [selectedModel, setSelectedModel] = useState(supportedModels[0]!);
  const ChatComponent = selectedModel.component;

  return (
    <main className="container mx-auto flex flex-col gap-4 self-stretch py-4">
      <div className="mt-16 flex flex-col gap-4 self-center">
        <h1 className="text-center font-mono text-4xl">assistant-ui</h1>

        <p className="text-center text-lg">
          Unstyled React components for chat and co-pilot UIs
        </p>
      </div>

      <div className="mb-12 flex justify-center gap-2">
        <Button asChild>
          <Link href="/docs">Documentation</Link>
        </Button>

        <Button variant="secondary" asChild>
          <Link href="https://github.com/Yonom/assistant-ui">GitHub</Link>
        </Button>
      </div>
      <div className="flex">
        <div className="flex flex-grow gap-3">
          {supportedModels.map((model) => (
            <Badge
              key={model.name}
              onClick={() => setSelectedModel(model)}
              className="cursor-pointer px-4 py-2"
              variant={
                selectedModel.name === model.name ? "default" : "secondary"
              }
            >
              {model.name}
            </Badge>
          ))}
        </div>
      </div>
      <div className="h-[700px] overflow-hidden rounded-lg border shadow">
        <VercelAIThreadProvider chat={chat}>
          <ChatComponent />
        </VercelAIThreadProvider>
      </div>
    </main>
  );
}

export type AssistantProps = {
  chat: ReturnType<typeof useChat>;
};
