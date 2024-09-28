"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import { ComposerAttachmentState } from "../stores/Attachment";
import {
  AttachmentContext,
  AttachmentContextValue,
} from "../react/AttachmentContext";
import { writableStore } from "../ReadonlyStore";
import { useThreadComposerStore } from "../react/ThreadContext";
import { ComposerState } from "../../api/ComposerRuntime";

type ComposerAttachmentProviderProps = PropsWithChildren<{
  attachmentIndex: number;
}>;

const getAttachment = (
  { attachments }: ComposerState,
  useAttachment: AttachmentContextValue["useAttachment"] | undefined,
  partIndex: number,
) => {
  const attachment = attachments[partIndex];
  if (!attachment) return null;

  // if the attachment is the same, don't update
  const currentState = useAttachment?.getState();
  if (currentState && currentState.attachment === attachment) return null;

  return Object.freeze({ attachment });
};

const useComposerAttachmentContext = (partIndex: number) => {
  const threadComposerStore = useThreadComposerStore();
  const [context] = useState<AttachmentContextValue & { type: "composer" }>(
    () => {
      const useAttachment = create<ComposerAttachmentState>(
        () =>
          getAttachment(threadComposerStore.getState(), undefined, partIndex)!,
      );

      return { type: "composer", useAttachment };
    },
  );

  useEffect(() => {
    const syncAttachment = (composer: ComposerState) => {
      const newState = getAttachment(
        composer,
        context.useAttachment,
        partIndex,
      );
      if (!newState) return;
      writableStore(context.useAttachment).setState(newState, true);
    };

    syncAttachment(threadComposerStore.getState());
    return threadComposerStore.subscribe(syncAttachment);
  }, [context, threadComposerStore, partIndex]);

  return context;
};

export const ComposerAttachmentProvider: FC<
  ComposerAttachmentProviderProps
> = ({ attachmentIndex: partIndex, children }) => {
  const context = useComposerAttachmentContext(partIndex);

  return (
    <AttachmentContext.Provider value={context}>
      {children}
    </AttachmentContext.Provider>
  );
};
