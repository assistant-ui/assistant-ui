"use client";

import { Claude } from "@/components/claude/Claude";
import { Shadcn } from "@/components/shadcn/Shadcn";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useChat } from "ai/react";
import { AssistantRuntimeProvider, useEdgeRuntime } from "@assistant-ui/react";
import Link from "next/link";
import { FC, useState } from "react";
import { ChatGPT } from "../../components/chatgpt/ChatGPT";
import { GenUI } from "../../components/genui/GenUI";
import { Artifacts } from "../../components/artifacts/Artifacts";
import { ModalChat } from "../../components/modal/ModalChat";
import {
  Testimonial,
  TESTIMONIALS,
} from "@/components/testimonials/testimonials";
import Image from "next/image";
import { ChatBubbleIcon } from "@radix-ui/react-icons";

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
    <main className="container mx-auto flex flex-col gap-6 self-stretch py-4">
      <div className="mt-12 flex flex-col gap-4 self-center">
        <h1 className="text-center text-4xl font-extrabold">
          Build in-app AI chatbots
          <br />
          in days, not weeks.
        </h1>
        <p className="text-foreground/85 text-center text-xl">
          assistant-ui is a chatbot UI for your React app
        </p>
      </div>

      <div className="mb-8 flex justify-center gap-2">
        <Button asChild>
          <Link href="/docs">Get Started</Link>
        </Button>
      </div>
      <div className="mx-auto flex w-full max-w-screen-xl flex-col">
        <p className="font-bold">Examples:</p>
        <div className="mt-2 flex overflow-x-scroll">
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
            50+ developers are building with assistant-ui, you're in good
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
              href="https://github.com/Yonom/assistant-ui"
            >
              🌟 Star us on Github
            </a>
          </div>
        </div>

        <div className="relative max-h-[500px] overflow-hidden">
          <div className="relative columns-1 gap-4 overflow-hidden sm:columns-2 lg:columns-3 xl:columns-4">
            {TESTIMONIALS.map((testimonial, idx) => (
              <TestimonialView key={idx} {...testimonial} />
            ))}
          </div>
          <div className="from-background via-background pointer-events-none absolute -bottom-8 left-0 z-10 h-[120px] w-full bg-gradient-to-t" />
        </div>
      </div>
    </main>
  );
}

const TestimonialView: FC<Testimonial> = (testimonial) => {
  return (
    <div className="mb-4 break-inside-avoid-column">
      <a target="_blank" href={testimonial.url}>
        <div className="bg-card hover:bg-border flex flex-col gap-3 rounded-lg border p-6 shadow transition-colors">
          <div className="relative flex items-center gap-2">
            <Image
              alt={"@" + testimonial.username + "'s twitter image"}
              loading="lazy"
              width="64"
              height="64"
              className="h-10 w-10 rounded-full border"
              src={testimonial.avatar}
            />
            <p className="text-sm font-medium">{testimonial.username}</p>
            <div className="bg-background absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full">
              <XLogo />
            </div>
          </div>
          <p className="text-muted-foreground whitespace-pre-line">
            {testimonial.message}
          </p>
        </div>
      </a>
    </div>
  );
};

const XLogo: FC = () => {
  return (
    <svg
      className="h-[12px] w-[12px]"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </svg>
  );
};

export type AssistantProps = {
  chat: ReturnType<typeof useChat>;
};

const MyRuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const runtime = useEdgeRuntime({ api: "/api/chat" });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
