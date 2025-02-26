"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SendHorizontalIcon } from "lucide-react";
import { RSCDisplay } from "@assistant-ui/react-ai-sdk";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-center px-4 pb-3">
      <ThreadPrimitive.Viewport className="flex w-full flex-grow flex-col items-center overflow-y-scroll pt-16">
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
    <ComposerPrimitive.Root className="flex w-full max-w-2xl items-end rounded-lg border p-0.5 shadow-sm">
      <ComposerPrimitive.Input
        placeholder="Write a message..."
        className="placeholder:text-foreground/50 h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm outline-none"
      />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send className="bg-foreground m-2 flex h-8 w-8 items-center justify-center rounded-md text-2xl font-bold shadow disabled:opacity-10">
          <SendHorizontalIcon className="text-background size-4" />
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
    <MessagePrimitive.Root className="relative mb-12 flex w-full max-w-2xl gap-3">
      <Avatar>
        <AvatarFallback>Y</AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-semibold">You</p>

        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mb-12 flex w-full max-w-2xl gap-3">
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-semibold">Assistant</p>

        <MessagePrimitive.Content components={{ Text: RSCDisplay }} />
      </div>
    </MessagePrimitive.Root>
  );
};

type IconButton = ButtonProps & { tooltip: string };

const IconButton: FC<IconButton> = ({
  children,
  tooltip,
  className,
  ...rest
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-auto p-1", className)}
          {...rest}
        >
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
};
