"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAssistantStoreWithSelector } from "../react/utils/createAssistantStoreWithSelector";
import { AssistantApiContext } from "../react/AssistantApiContext";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const client = useAssistantStoreWithSelector({
    attachment: {
      state: (state) => {
        return state.message.attachments![index]!;
      },
      action: (actions) => {
        return actions.message.attachment({ index });
      },
    },
    meta: {
      attachment: {
        source: "message",
        query: {
          type: "index",
          index,
        },
      },
    },
  });

  return <AssistantApiContext value={client}>{children}</AssistantApiContext>;
};

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const client = useAssistantStoreWithSelector({
    attachment: {
      state: (state) => {
        return state.composer.attachments![index]!;
      },
      action: (actions) => {
        return actions.composer.attachment({ index });
      },
    },
    meta: {
      attachment: {
        source: "composer",
        query: {
          type: "index",
          index,
        },
      },
    },
  });

  return <AssistantApiContext value={client}>{children}</AssistantApiContext>;
};
