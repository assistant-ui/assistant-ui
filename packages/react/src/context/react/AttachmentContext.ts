"use client";

import { createContext, useContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import {
  ComposerAttachmentState,
  MessageAttachmentState,
} from "../stores/Attachment";

export type AttachmentContextValue = {
  type: "composer" | "message";
  useAttachment: ReadonlyStore<
    ComposerAttachmentState | MessageAttachmentState
  >;
};

type ComposerAttachmentContextValue = {
  type: "composer";
  useAttachment: ReadonlyStore<ComposerAttachmentState>;
};

type MessageAttachmentContextValue = {
  type: "message";
  useAttachment: ReadonlyStore<MessageAttachmentState>;
};

export const AttachmentContext = createContext<AttachmentContextValue | null>(
  null,
);

export function useAttachmentContext(): AttachmentContextValue;
export function useAttachmentContext(options: {
  type: "composer";
}): ComposerAttachmentContextValue;
export function useAttachmentContext(options: {
  type: "message";
}): MessageAttachmentContextValue;
export function useAttachmentContext(options: {
  optional: true;
}): AttachmentContextValue | null;
export function useAttachmentContext(options?: {
  type?: AttachmentContextValue["type"];
  optional?: true;
}) {
  const context = useContext(AttachmentContext);
  if (options?.type === "composer" && context?.type !== "composer")
    throw new Error(
      "This component must be used within a ComposerPrimitive.Attachments component.",
    );
  if (options?.type === "message" && context?.type !== "message")
    throw new Error(
      "This component must be used within a MessagePrimitive.Attachments component.",
    );
  if (!options?.optional && !context)
    throw new Error(
      "This component must be used within a ComposerPrimitive.Attachments or MessagePrimitive.Attachments component.",
    );

  return context;
}
