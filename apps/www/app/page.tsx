"use client";

import React, { useState } from "react";
import { ChatGPT } from "../components/chatgpt/ChatGPT";
import { Badge } from "@/components/ui/badge";
import { Claude } from "../components/claude/Claude";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChat } from "ai/react";
import { Thread } from "@assistant-ui/react";
import { Shadcn } from "@/components/shadcn/Shadcn";

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
      <div className="mt-16 mb-12 flex flex-col gap-4 self-center">
        <h1 className="text-center font-mono text-4xl">
          <span className="text-zinc-400">npm install</span> assistant-ui
        </h1>

        <p className="text-center text-lg">
          Unstyled React components for chat and co-pilot UIs
        </p>
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
        <div>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="GPT-4 Turbo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="mixtral-8x7b">Mixtral 8x7B</SelectItem>
              <SelectItem value="mistral-7b">Mistral 7B</SelectItem>
              <SelectItem value="llama-3-70b">Llama 3 70B</SelectItem>
              <SelectItem value="llama-3-13b">Llama 3 13B</SelectItem>
              <SelectItem value="llama-3-7b">Llama 3 7B</SelectItem>
              <SelectItem value="llama-2-70b">Llama 2 70B</SelectItem>
              <SelectItem value="llama-2-13b">Llama 2 13B</SelectItem>
              <SelectItem value="llama-2-7b">Llama 2 7B</SelectItem>
              <SelectItem value="codellama-70b">Codellama 70B</SelectItem>
              <SelectItem value="gemma-7b">Gemma 7B</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="h-[700px] overflow-hidden rounded-lg border shadow">
        <Thread.Provider chat={chat}>
          <ChatComponent />
        </Thread.Provider>
      </div>
    </main>
  );
}

export type AssistantProps = {
  chat: ReturnType<typeof useChat>;
};
