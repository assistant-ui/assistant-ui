"use client";
import { ChatList } from "assistant-ui/src/primitives/ChatList";
import { ChatPrimitive } from "assistant-ui/src/primitives/ChatPrimitive";
import { MessageActionBarPrimitive } from "assistant-ui/src/primitives/MessageActionBarPrimitive";
import { MessageContentValue } from "assistant-ui/src/primitives/MessageValues";
import { useIsEditingContext } from "assistant-ui/src/utils/Context";
import React, { FC, useCallback } from "react";
import { Composer } from "@/components/chatgpt/Composer";
import {
  ChatMessageAvatar,
  MessageRoleLabel,
  MessageContentOrEditing,
  MessageEditingPrimitive,
  ReloadButton,
  CopyButton,
  EditBeginButton,
  EditConfirmButton,
  EditCancelButton,
} from "@/components/chatgpt/Misc";
import { ChatEmpty } from "./ChatEmpty";
import { BranchUI } from "@/components/chatgpt/BranchUI";
import { AssistantProps } from "../../app/page";

export const ChatGPT: FC<AssistantProps> = ({ chat }) => {
  return (
    <ChatPrimitive chat={chat}>
      <div className="flex h-full flex-col items-stretch bg-[#212121] px-12 pb-4 pt-16">
        <div className="flex flex-grow flex-col overflow-y-scroll">
          <ChatList components={{ Message: ChatMessage, Empty: ChatEmpty }} />
        </div>
        <Composer />
        <p className="p-2 text-center text-xs text-[#cdcdcd]">
          ChatGPT can make mistakes. Consider checking important information.
        </p>
      </div>
    </ChatPrimitive>
  );
};

const ChatMessage: FC = () => {
  const [isEditing] = useIsEditingContext();

  return (
    <div className="mb-12 flex gap-3">
      <ChatMessageAvatar />
      <div className="flex-grow">
        <MessageRoleLabel />
        <MessageContentOrEditing
          components={{
            MessageContent: useCallback(
              () => (
                <p className="text-[#eee]">
                  <MessageContentValue />
                </p>
              ),
              [],
            ),
            MessageEditing: useCallback(
              () => (
                <MessageEditingPrimitive className="mb-2 flex w-full bg-transparent text-white outline-none" />
              ),
              [],
            ),
          }}
        />

        <MessageActionBarPrimitive
          className={
            "mt-2 flex items-center  gap-3 " +
            (isEditing !== false ? "justify-center" : "")
          }
          components={{
            Branch: BranchUI,
            Reload: ReloadButton,
            Copy: CopyButton,
            EditBegin: EditBeginButton,
            EditConfirm: EditConfirmButton,
            EditCancel: EditCancelButton,
          }}
        />
      </div>
    </div>
  );
};
