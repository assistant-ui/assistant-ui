"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import React, { type FC } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SendHorizonalIcon } from "lucide-react";
import { ThreadPrimitiveNotEmpty } from "./ThreadNotEmptyHook";
import AI_ThreadSuggestion from './AI_ThreadSuggestion';
import ThreadSuggestion from './ThreadSuggestion';


export const Thread: FC = () => {  {/* This is UI for ongoing chat */}
  return (
    <TooltipProvider>
      <ThreadPrimitive.Root className="bg-background h-full">
        <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth px-4 pt-8">
          <ThreadWelcome />
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
          <div className="sticky bottom-0 mt-4 flex w-full max-w-2xl flex-grow flex-col items-center justify-end rounded-t-lg bg-inherit pb-4">
            <ThreadPrimitiveNotEmpty>
              <div className="w-full px-4 mb-4">
                <div className="flex flex-wrap gap-4 justify-center">
                  <ThreadPrimitive.If running={false}> {/*Important to wrap Thread suggestion into if statement since the original message is streamed and we don't want to generate buttons ahead of time*/}
                    <AI_ThreadSuggestion>
                    </AI_ThreadSuggestion>
                  </ThreadPrimitive.If>
                </div>
              </div>
            </ThreadPrimitiveNotEmpty>
            <Composer />
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </TooltipProvider>
  );
};

const ThreadWelcome: FC = () => { {/* This is WELCOME UI */}
  return (
    <div className="w-full max-w-2xl flex flex-col grow py-6 px-4">
      <ThreadPrimitive.Empty>
        <div className="flex flex-grow basis-full flex-col items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tighter tracking-tighter mb-4 text-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-teal-400">AI_button. Try me</span>
          </h1>
        </div>
        <div className="w-full px-4 mb-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <ThreadSuggestion prompt="Tell me something goofy">
              <p className="font-semibold">Press here</p>
            </ThreadSuggestion>
          </div>
        </div>
      </ThreadPrimitive.Empty>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="relative flex w-full items-end rounded-lg border transition-shadow focus-within:shadow-sm">
      <ComposerPrimitive.Input
        autoFocus
        placeholder="Write a message..."
        rows={1}
        className="placeholder:text-muted-foreground size-full max-h-40 resize-none bg-transparent p-4 pr-12 text-sm outline-none"
      />
      <Tooltip>
        <ComposerPrimitive.Send asChild>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={cn(
                "absolute bottom-0 right-0 m-2.5 size-8 p-2 transition-opacity"
              )}
            >
              <SendHorizonalIcon />
              <span className="sr-only">Send</span>
            </Button>
          </TooltipTrigger>
        </ComposerPrimitive.Send>
        <TooltipContent side="bottom">Send</TooltipContent>
      </Tooltip>
    </ComposerPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="my-4 grid w-full max-w-2xl auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2">
      <div className="bg-muted text-foreground col-start-2 row-start-1 max-w-xl break-words rounded-3xl px-5 py-2.5">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative my-4 grid w-full max-w-2xl grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
      <Avatar className="col-start-1 row-span-full row-start-1 mr-4">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>

      <div className="text-foreground col-start-2 row-start-1 my-1.5 max-w-xl break-words leading-7">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};