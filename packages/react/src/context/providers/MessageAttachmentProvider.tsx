"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import type { MessageState } from "../stores";
import { useMessageStore } from "../react";
import { MessageAttachmentState } from "../stores/Attachment";
import {
  AttachmentContext,
  AttachmentContextValue,
} from "../react/AttachmentContext";
import { writableStore } from "../ReadonlyStore";

type MessageAttachmentProviderProps = PropsWithChildren<{
  attachmentIndex: number;
}>;

const getAttachment = (
  { message }: MessageState,
  useAttachment: AttachmentContextValue["useAttachment"] | undefined,
  partIndex: number,
) => {
  if (message.role !== "user") return null;

  const attachments = message.attachments;
  const attachment = attachments[partIndex];
  if (!attachment) return null;

  // if the attachment is the same, don't update
  const currentState = useAttachment?.getState();
  if (currentState && currentState.attachment === attachment) return null;

  return Object.freeze({ attachment });
};

const useMessageAttachmentContext = (partIndex: number) => {
  const messageStore = useMessageStore();
  const [context] = useState<AttachmentContextValue & { type: "message" }>(
    () => {
      const useAttachment = create<MessageAttachmentState>(
        () => getAttachment(messageStore.getState(), undefined, partIndex)!,
      );

      return { type: "message", useAttachment };
    },
  );

  useEffect(() => {
    const syncAttachment = (messageState: MessageState) => {
      const newState = getAttachment(
        messageState,
        context.useAttachment,
        partIndex,
      );
      if (!newState) return;
      writableStore(context.useAttachment).setState(newState, true);
    };

    syncAttachment(messageStore.getState());
    return messageStore.subscribe(syncAttachment);
  }, [context, messageStore, partIndex]);

  return context;
};

export const MessageAttachmentProvider: FC<MessageAttachmentProviderProps> = ({
  attachmentIndex: partIndex,
  children,
}) => {
  const context = useMessageAttachmentContext(partIndex);

  return (
    <AttachmentContext.Provider value={context}>
      {children}
    </AttachmentContext.Provider>
  );
};
