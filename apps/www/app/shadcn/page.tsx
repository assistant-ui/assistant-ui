"use client";

import React from "react";
import { Shadcn } from "@/components/shadcn/Shadcn";
import { useChat } from "ai/react";
import { Thread } from "@assistant-ui/react";

export default function Home() {
  const chat = useChat();
  return (
    <main className="container mx-auto flex flex-col gap-4 self-stretch py-4">
      <div className="h-[700px] overflow-hidden rounded-lg border shadow">
        <Thread.Provider chat={chat}>
          <Shadcn />
        </Thread.Provider>
      </div>
    </main>
  );
}

export type AssistantProps = {
  chat: ReturnType<typeof useChat>;
};
