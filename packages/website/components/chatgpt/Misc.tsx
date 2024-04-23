"use client";
import * as Avatar from "@radix-ui/react-avatar";
import React, { ChangeEvent, ComponentType, FC } from "react";
import { ClipboardIcon, Pencil1Icon, ReloadIcon } from "@radix-ui/react-icons";
import * as MessageActionPrimitive from "assistant-ui/src/primitives/MessageActionPrimitive";
import {
  useIsEditingContext,
  useMessageContext,
} from "assistant-ui/src/utils/Context";

export const ChatMessageAvatar = () => {
  const message = useMessageContext();
  return (
    <Avatar.Root className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[24px] bg-white">
      <Avatar.AvatarFallback className="text-xs">
        {message.role[0].toUpperCase()}
      </Avatar.AvatarFallback>
    </Avatar.Root>
  );
};

export const CopyButton = () => {
  return (
    <MessageActionPrimitive.Copy className="text-[#b4b4b4] hover:text-white">
      <ClipboardIcon />
    </MessageActionPrimitive.Copy>
  );
};

export const ReloadButton = () => {
  return (
    <MessageActionPrimitive.Reload className="text-[#b4b4b4] hover:text-white">
      <ReloadIcon />
    </MessageActionPrimitive.Reload>
  );
};

export const EditBeginButton = () => {
  return (
    <MessageActionPrimitive.EditBegin className="text-[#b4b4b4] hover:text-white">
      <Pencil1Icon />
    </MessageActionPrimitive.EditBegin>
  );
};

export const EditConfirmButton = () => {
  return (
    <MessageActionPrimitive.EditConfirm className="rounded-lg bg-[#10a37e] px-3 py-2 text-sm text-white hover:bg-[#1a7f64]">
      Save & Submit
    </MessageActionPrimitive.EditConfirm>
  );
};

export const EditCancelButton = () => {
  return (
    <MessageActionPrimitive.EditCancel className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-800">
      Cancel
    </MessageActionPrimitive.EditCancel>
  );
};

type MessageContentOrEditingProps = {
  components: {
    MessageContent: ComponentType<{}>;
    MessageEditing: ComponentType<{}>;
  };
};

export const MessageContentOrEditing: FC<MessageContentOrEditingProps> = ({
  components: { MessageContent, MessageEditing },
}) => {
  const [isEditing] = useIsEditingContext();
  return isEditing !== false ? <MessageEditing /> : <MessageContent />;
};

export const MessageEditingPrimitive: FC<React.HTMLProps<HTMLInputElement>> = (
  props,
) => {
  const [isEditing, setIsEditing] = useIsEditingContext();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsEditing(e.target.value);
  };

  if (isEditing === false) return null;

  return (
    <input type="text" {...props} onChange={handleChange} value={isEditing} />
  );
};

export const MessageRoleLabel = () => {
  const message = useMessageContext();
  return (
    <p className="font-semibold text-white">
      {message.role === "user" ? "You" : "ChatGPT"}
    </p>
  );
};
