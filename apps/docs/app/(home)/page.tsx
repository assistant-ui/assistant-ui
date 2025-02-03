"use client";

import { Claude } from "@/components/claude/Claude";
import { Shadcn } from "@/components/shadcn/Shadcn";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useChat } from "ai/react";
import {
  AssistantCloud,
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import Link from "next/link";
import { useState } from "react";
import { ChatGPT } from "../../components/chatgpt/ChatGPT";
import { GenUI } from "../../components/genui/GenUI";
import { Artifacts } from "../../components/artifacts/Artifacts";
import { ModalChat } from "../../components/modal/ModalChat";
import { TESTIMONIALS } from "@/components/testimonials/testimonials";
import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { TestimonialContainer } from "../../components/testimonials/TestimonialContainer";

const supportedModels = [
  {
    name: "Standalone",
    component: Shadcn,
  },
  {
    name: "Modal",
    component: ModalChat,
  },
  {
    name: "Tool UI",
    component: GenUI,
  },
  {
    name: "Artifacts",
    component: Artifacts,
  },
  {
    name: "ChatGPT Theme",
    component: ChatGPT,
  },
  {
    name: "Claude Theme",
    component: Claude,
  },
];

export default function HomePage() {
  const [selectedModel, setSelectedModel] = useState(supportedModels[0]!);
  const ChatComponent = selectedModel.component;

  return (
    <main className="container mx-auto flex flex-col gap-6 self-stretch p-4">
      <div className="mt-12 flex flex-col gap-4 self-center">
        <h1 className="text-center text-4xl font-extrabold">
          Typescript/React library for AI Chat
        </h1>
        <p className="text-foreground/85 text-center text-xl">
          Open Source, built on shadcn/ui and Tailwind CSS
        </p>
      </div>

      <div className="mb-8 flex justify-center gap-2">
        <Button asChild>
          <Link href="/docs/getting-started">Get Started</Link>
        </Button>
      </div>
      <div className="mx-auto flex w-full max-w-screen-xl flex-col">
        <p className="font-bold">Examples:</p>
        <div className="mt-2 flex overflow-x-auto">
          <div className="flex flex-grow gap-3">
            {supportedModels.map((model) => (
              <Badge
                key={model.name}
                onClick={() => setSelectedModel(model)}
                className="shrink-0 cursor-pointer px-4 py-2"
                variant={
                  selectedModel.name === model.name ? "default" : "secondary"
                }
              >
                {model.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-4 h-[650px] overflow-hidden rounded-lg border shadow">
          <MyRuntimeProvider>
            <ChatComponent />
          </MyRuntimeProvider>
        </div>
      </div>
      <div className="my-20 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 self-center">
          <h1 className="text-2xl font-medium">Be part of the community</h1>
          <p>
            400+ developers are building with assistant-ui, you&apos;re in good
            company!
          </p>

          <div className="my-2 flex gap-4">
            <a
              className={buttonVariants({ variant: "outline" })}
              href="https://discord.gg/S9dwgCNEFs"
            >
              <ChatBubbleIcon className="mr-2 size-4" /> Join our Discord
            </a>
            <a
              className={buttonVariants({ variant: "outline" })}
              href="https://github.com/assistant-ui/assistant-ui"
            >
              🌟 Star us on Github
            </a>
          </div>
        </div>

        <div className="relative mx-auto max-h-[500px] w-full max-w-screen-xl overflow-hidden">
          <TestimonialContainer
            testimonials={TESTIMONIALS}
            className="sm:columns-2 lg:columns-3 xl:columns-4"
          />
          <div className="from-background via-background pointer-events-none absolute -bottom-8 left-0 z-10 h-[120px] w-full bg-gradient-to-t" />
        </div>
      </div>
    </main>
  );
}

export type AssistantProps = {
  chat: ReturnType<typeof useChat>;
};

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  authToken: () =>
    fetch("/api/assistant-ui-token", { method: "POST" })
      .then((r) => r.json())
      .then((r) => r.token),
});

const MyRuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const runtime = useChatRuntime({
    api: "/api/chat",
    cloud,
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
      feedback: {
        submit: ({ message, type }) => {
          console.log({ message, type });
        },
      },
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
