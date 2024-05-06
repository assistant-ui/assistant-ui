"use client";

import { Thread, Message, Composer, ActionBar } from "assistant-ui";
import React, { FC } from "react";
import { cn } from "@/lib/utils";
import * as Avatar from "@radix-ui/react-avatar";
import { ReloadIcon, ArrowUpIcon, ClipboardIcon } from "@radix-ui/react-icons";
import { useMessageContext } from "assistant-ui/src/utils/context/MessageContext";

export const Claude: FC = () => {
  return (
    <Thread.Root className="flex h-full flex-col items-stretch bg-[#2b2a27] px-12 pt-16 font-serif">
      <Thread.Viewport className="flex flex-grow flex-col overflow-y-scroll">
        <Thread.Messages components={{ Message: ChatMessage }} />
        <Thread.If empty={false}>
          <p className="p-2 text-right text-xs text-[#b8b5a9]">
            Claude can make mistakes. Please double-check responses.
          </p>
        </Thread.If>
      </Thread.Viewport>

      <Composer.Root className="flex flex-col rounded-t-xl border border-[#6c6a6040] bg-[#393937] p-0.5">
        <div className="flex">
          <Composer.Input
            placeholder="Reply to Claude..."
            className="h-12 flex-grow resize-none bg-transparent p-3.5 text-sm text-white outline-none placeholder:text-white/50"
          />
          <Composer.Send
            type="submit"
            className="m-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#ae5630] text-2xl font-bold disabled:opacity-0"
          >
            <ArrowUpIcon
              width={16}
              height={16}
              className="text-[#ddd] [&_path]:stroke-white [&_path]:stroke-[0.5]"
            />
          </Composer.Send>
        </div>
        <p className="-mt-1 mb-3 px-3.5 text-sm text-white/70">
          Claude 3 Sonnet
        </p>
      </Composer.Root>
    </Thread.Root>
  );
};

const ChatMessage: FC = () => {
  const message = useMessageContext("ChatMessage", (s) => s.message);

  return (
    <Message.Root className="mb-4 flex flex-col gap-3">
      <div
        className={cn(
          "relative flex gap-2 rounded-2xl bg-gradient-to-b from-[#21201c] from-50% to-[#1a1915] px-3 py-2.5",
          message.role === "user" && "self-start",
          message.role === "assistant" &&
            "bg-[linear-gradient(to_bottom,_hsla(60_1.8%_22%_/_0.75)_0%,_hsla(60_1.8%_22%_/_0)_90%)] pb-4 font-serif",
        )}
      >
        {message.role === "assistant" && (
          <div className="absolute inset-0 rounded-2xl  border-[0.5px]  border-[hsla(50_5.8%_40%/0.15)]  bg-[radial-gradient(ellipse_at_left_top,_hsla(60_1.8%_22%/0.5)_0%,_hsla(60_1.8%_22%/0.3)_60%)]  shadow-[0_4px_24px_rgba(0,0,0,0.015)]" />
        )}
        <div className="relative flex gap-2">
          <Message.If user>
            <Avatar.Root className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[24px] bg-white">
              <Avatar.AvatarFallback className="text-xs">
                U
              </Avatar.AvatarFallback>
            </Avatar.Root>
          </Message.If>

          <p className="text-[#eee]">
            <Message.PlaintextContent />
          </p>
        </div>
      </div>

      <Message.If assistant>
        <ActionBar.Root className="relative -mt-6 mr-3  flex items-center gap-3 self-end rounded-lg border border-[#6c6a6040] bg-[#393937] px-2 py-1">
          <ActionBar.Reload className="flex items-center gap-1 font-mono text-xs text-[#b4b4b4] hover:text-white">
            <ReloadIcon width={12} height={12} />
            Retry
          </ActionBar.Reload>

          <ActionBar.Copy className="flex items-center gap-1 font-mono text-xs text-[#b4b4b4] hover:text-white">
            <ClipboardIcon width={12} height={12} />
            Copy
          </ActionBar.Copy>
        </ActionBar.Root>
      </Message.If>
    </Message.Root>
  );
};
