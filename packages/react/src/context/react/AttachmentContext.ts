"use client";

import { createContext, useContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { AttachmentState } from "../stores/Attachment";

export type AttachmentContextValue = {
  useAttachment: ReadonlyStore<AttachmentState>;
};

export const AttachmentContext = createContext<AttachmentContextValue | null>(
  null,
);

export function useAttachmentContext(): AttachmentContextValue;
export function useAttachmentContext(options: {
  optional: true;
}): AttachmentContextValue | null;
export function useAttachmentContext(options?: { optional: true }) {
  const context = useContext(AttachmentContext);
  if (!options?.optional && !context)
    throw new Error(
      "This component must be used within a ComposerPrimitive.Attachments component.",
    );
  return context;
}
