"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SendHorizonalIcon } from "lucide-react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-center pb-3">
      <ThreadPrimitive.Viewport className="flex w-full flex-grow flex-col items-center overflow-y-scroll scroll-smooth px-4 pt-12">
        <ThreadPrimitive.Empty>
          <ThreadEmpty />
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      <Composer />
    </ThreadPrimitive.Root>
  );
};

const ThreadEmpty: FC = () => {
  return (
    <div className="flex flex-grow flex-col items-center justify-center">
      <Avatar>
        <AvatarFallback>C</AvatarFallback>
      </Avatar>
      <p className="mt-4 text-xl">How can I help you today?</p>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex w-[calc(100%-32px)] max-w-[42rem] items-end rounded-lg border p-0.5 transition-shadow focus-within:shadow-sm">
      <ComposerPrimitive.Input
        placeholder="Write a message..."
        className="placeholder:text-foreground/50 h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm outline-none"
      />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send className="bg-foreground m-2 flex h-8 w-8 items-center justify-center rounded-md text-2xl font-bold shadow transition-opacity disabled:opacity-10">
          <SendHorizonalIcon className="text-background size-4" />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel className="border-foreground m-3.5 flex size-5 items-center justify-center rounded-full border-2">
          <div className="bg-foreground size-2 rounded-[1px]" />
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mb-6 flex w-full max-w-2xl flex-col items-end gap-2 pl-24">
      <div className="relative mr-1 flex items-start gap-3">
        <p className="bg-foreground/5 text-foreground max-w-xl whitespace-pre-line break-words rounded-3xl px-5 py-2.5">
          <MessagePrimitive.Content />
        </p>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mb-6 flex w-full max-w-2xl gap-3">
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar>

      <div className="mt-2 flex-grow">
        <MessagePrimitive.InProgress className="bg-foreground inline-block size-3 animate-pulse rounded-full" />
        <p className="text-foreground max-w-xl whitespace-pre-line break-words">
          <MessagePrimitive.Content />
        </p>
      </div>
    </MessagePrimitive.Root>
  );
};
