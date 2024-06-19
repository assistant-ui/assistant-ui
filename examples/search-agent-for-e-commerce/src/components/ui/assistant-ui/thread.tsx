import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import React, { PropsWithChildren, type FC } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ArrowDownIcon, SendHorizonalIcon } from "lucide-react";
import uncleRecoImage from '/Users/matthewdi/Desktop/Shardul/conversecart/plugin/assets/uncle-reco.png';

export const Thread: FC = () => {
  return (
    <TooltipProvider>
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
          <ThreadScrollToBottom />
        </ThreadPrimitive.Viewport>

        <Composer />
      </ThreadPrimitive.Root>
    </TooltipProvider>
  );
};

const ThreadEmpty: FC = () => {
  return (
    <div className="w-full max-w-2xl flex flex-col grow py-6 px-4 justify-end"> {/* Stick to bottom */}
      <div className="flex flex-grow flex-col items-center justify-center mb-1"> {/* Reduced margin-bottom */}
        <img src="/uncle-reco.png" alt="Uncle Reco" className="w-1/2 max-w-xs mb-4" /> {/* Smaller image */}
        <div className="flex items-center">
        <Avatar className="mr-4" style={{ width: '20px', height: '20px' }}> {/* Adjusted size */}
            <AvatarImage src="/unclereco-favicon.ico" alt="AI" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <p className="mt-4">Hi, do you know what product you are looking for, or you have a general question?</p>
        </div>
      </div>
      <div className="flex gap-4 self-stretch flex-col sm:flex-row">
        <ThreadSuggestion prompt="I need help with product search">
          <p className="font-semibold mb-2">Product search</p>
        </ThreadSuggestion>
        <ThreadSuggestion prompt="I need to talk to human agent support">
          <p className="font-semibold mb-2">Human agent</p>
        </ThreadSuggestion>
      </div>
    </div>
  );
};

const ThreadSuggestion: FC<PropsWithChildren<{ prompt: string }>> = ({ prompt, children }) => {
  return (
    <ThreadPrimitive.Suggestion prompt={prompt} method="replace" autoSend asChild>
      <Button variant="outline" className="sm:basis-full flex items-center justify-center text-md h-full"> 
        {children}
      </Button>
    </ThreadPrimitive.Suggestion>
  )
}

const ThreadScrollToBottom: FC = () => {
  return (
    <div className="sticky bottom-0">
      <ThreadPrimitive.ScrollToBottom asChild>
        <IconButton
          tooltip="Scroll to bottom"
          variant="outline"
          className="-top-10 absolute rounded-full disabled:invisible"
        >
          <ArrowDownIcon className="size-4" />
        </IconButton>
      </ThreadPrimitive.ScrollToBottom>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex w-[calc(100%-32px)] max-w-[40rem] items-end rounded-lg border p-0.5 transition-shadow focus-within:shadow-sm">
      <ComposerPrimitive.Input
        placeholder="Write a message..."
        className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm outline-none placeholder:text-foreground/50"
      />
      <ComposerPrimitive.Send className="m-2 flex h-8 w-8 items-center justify-center rounded-md bg-foreground font-bold text-2xl shadow transition-opacity disabled:opacity-10">
        <SendHorizonalIcon className="size-4 text-background" />
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative flex w-full max-w-2xl gap-3 pb-6">
      {/* OPTIONALLY YOU CAN ADD AVATARS OF THE ASSISTANT */}
      {/* <Avatar>
        <AvatarFallback>Y</AvatarFallback>
      </Avatar> */}

      <div className="flex-grow">
        {/* <p className="font-semibold">You</p> */}

        <div className="bg-gray-800 text-white rounded-full p-4">
          <p className="whitespace-pre-line">
            <MessagePrimitive.Content />
          </p>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative flex w-full max-w-2xl gap-3 pb-6">
      {/* OPTIONALLY YOU CAN ADD AVATARS OF THE USER */}
      {/* <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar> */}

      <div className="flex-grow">
        {/* <p className="font-semibold">Assistant</p> */}

        <p className="whitespace-pre-line text-foreground">
          <MessagePrimitive.Content />
        </p>
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