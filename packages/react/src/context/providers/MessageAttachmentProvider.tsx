"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import type { MessageState } from "../stores";
import { useMessageContext } from "../react";
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
  let attachment = attachments[partIndex];
  if (!attachment) return null;

  // if the attachment is the same, don't update
  const currentState = useAttachment?.getState();
  if (currentState && currentState.attachment === attachment) return null;

  return Object.freeze({ attachment });
};

const useMessageAttachmentContext = (partIndex: number) => {
  const { useMessage } = useMessageContext();
  const [context] = useState<AttachmentContextValue & { type: "message" }>(
    () => {
      const useAttachment = create<MessageAttachmentState>(
        () => getAttachment(useMessage.getState(), undefined, partIndex)!,
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

    syncAttachment(useMessage.getState());
    return useMessage.subscribe(syncAttachment);
  }, [context, useMessage, partIndex]);

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
