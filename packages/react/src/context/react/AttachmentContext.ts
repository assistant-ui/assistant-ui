"use client";

import { createContext, useContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import {
  ComposerAttachmentState,
  MessageAttachmentState,
} from "../stores/Attachment";
import { createContextStoreHook } from "./utils/createContextStoreHook";

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

export function useAttachmentContext(options?: {
  optional?: false | undefined;
}): AttachmentContextValue;
export function useAttachmentContext(options?: {
  optional?: boolean | undefined;
}): AttachmentContextValue | null;
export function useAttachmentContext(options?: {
  optional?: boolean | undefined;
}) {
  const context = useContext(AttachmentContext);
  if (!options?.optional && !context)
    throw new Error(
      "This component must be used within a ComposerPrimitive.Attachments or MessagePrimitive.Attachments component.",
    );

  return context;
}

function useComposerAttachmentContext(): ComposerAttachmentContextValue;
function useComposerAttachmentContext(options: {
  optional: true;
}): ComposerAttachmentContextValue | null;
function useComposerAttachmentContext(options?: { optional?: true }) {
  const context = useAttachmentContext(options);
  if (!context) return null;
  if (context.type !== "composer")
    throw new Error(
      "This component must be used within a ComposerPrimitive.Attachments component.",
    );
  return context;
}

function useMessageAttachmentContext(): MessageAttachmentContextValue;
function useMessageAttachmentContext(options: {
  optional: true;
}): MessageAttachmentContextValue | null;
function useMessageAttachmentContext(options?: { optional?: true }) {
  const context = useAttachmentContext(options);
  if (!context) return null;
  if (context.type !== "message")
    throw new Error(
      "This component must be used within a MessagePrimitive.Attachments component.",
    );
  return context;
}

export const { useAttachment, useAttachmentStore } = createContextStoreHook(
  useAttachmentContext,
  "useAttachment",
);

export const {
  useAttachment: useComposerAttachment,
  useAttachmentStore: useComposerAttachmentStore,
} = createContextStoreHook(useComposerAttachmentContext, "useAttachment");

export const {
  useAttachment: useMessageAttachment,
  useAttachmentStore: useMessageAttachmentStore,
} = createContextStoreHook(useMessageAttachmentContext, "useAttachment");
