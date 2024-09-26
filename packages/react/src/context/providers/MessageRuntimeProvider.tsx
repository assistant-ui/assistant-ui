"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import type { CoreUserContentPart } from "../../types/AssistantTypes";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import { MessageContext } from "../react/MessageContext";
import type { MessageContextValue } from "../react/MessageContext";
import { makeEditComposerStore } from "../stores/EditComposer";
import { makeMessageUtilsStore } from "../stores/MessageUtils";
import { ReadonlyStore, writableStore } from "../ReadonlyStore";
import { MessageRuntime } from "../../api";

type MessageProviderProps = PropsWithChildren<{
  runtime: MessageRuntime;
}>;

const useMessageRuntimeStore = (runtime: MessageRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

const useMessageStore = (runtime: MessageRuntime) => {
  const [store] = useState(() => create(() => runtime.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

const useMessageUtilsStore = () => {
  const [store] = useState(() => makeMessageUtilsStore());
  return store;
};

const useEditComposerStore = (
  useMessageRuntime: ReadonlyStore<MessageRuntime>,
) => {
  const [store] = useState(() =>
    makeEditComposerStore({
      onEdit: () => {
        const text = getThreadMessageText(
          useMessageRuntime.getState().getState(),
        );

        return text;
      },
      onSend: (text) => {
        const message = useMessageRuntime.getState().getState();
        const previousText = getThreadMessageText(message);
        if (previousText === text) return;

        const nonTextParts = message.content.filter(
          (part): part is CoreUserContentPart =>
            part.type !== "text" && part.type !== "ui",
        );

        useMessageRuntime.getState().edit({
          role: message.role,
          content: [{ type: "text", text }, ...nonTextParts],
          attachments: message.attachments ?? [],
        });
      },
    }),
  );
  return store;
};

export const MessageRuntimeProvider: FC<MessageProviderProps> = ({
  runtime,
  children,
}) => {
  const useMessageRuntime = useMessageRuntimeStore(runtime);
  const useMessage = useMessageStore(runtime);
  const useMessageUtils = useMessageUtilsStore();
  const useEditComposer = useEditComposerStore(useMessageRuntime);
  const [context] = useState<MessageContextValue>(() => {
    return { useMessageRuntime, useMessage, useMessageUtils, useEditComposer };
  });

  return (
    <MessageContext.Provider value={context}>
      {children}
    </MessageContext.Provider>
  );
};
