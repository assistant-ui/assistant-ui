"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";
import { create } from "zustand";
import type { ComposerState } from "../stores";
import { useThreadContext } from "../react";
import { ComposerAttachmentState } from "../stores/Attachment";
import {
  AttachmentContext,
  AttachmentContextValue,
} from "../react/AttachmentContext";
import { writableStore } from "../ReadonlyStore";

type ComposerAttachmentProviderProps = PropsWithChildren<{
  attachmentIndex: number;
}>;

const getAttachment = (
  { attachments }: ComposerState,
  useAttachment: AttachmentContextValue["useAttachment"] | undefined,
  partIndex: number,
) => {
  let attachment = attachments[partIndex];
  if (!attachment) return null;

  // if the attachment is the same, don't update
  const currentState = useAttachment?.getState();
  if (currentState && currentState.attachment === attachment) return null;

  return Object.freeze({ attachment });
};

const useComposerAttachmentContext = (partIndex: number) => {
  const { useComposer } = useThreadContext();
  const [context] = useState<AttachmentContextValue & { type: "composer" }>(
    () => {
      const useAttachment = create<ComposerAttachmentState>(
        () => getAttachment(useComposer.getState(), undefined, partIndex)!,
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

    syncAttachment(useComposer.getState());
    return useComposer.subscribe(syncAttachment);
  }, [context, useComposer, partIndex]);

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
