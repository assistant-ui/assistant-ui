"use client";

import { createContext, useContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import {
  AttachmentRuntime,
  AttachmentState,
} from "../../api/AttachmentRuntime";
import { UseBoundStore } from "zustand";

export type AttachmentContextValue = {
  source: "thread-composer" | "edit-composer" | "message";
  useAttachment: UseBoundStore<ReadonlyStore<AttachmentState>>;
  useAttachmentRuntime: UseBoundStore<ReadonlyStore<AttachmentRuntime>>;
};

type ThreadComposerAttachmentContextValue = {
  source: "thread-composer";
  useAttachment: UseBoundStore<
    ReadonlyStore<AttachmentState & { source: "thread-composer" }>
  >;
  useAttachmentRuntime: UseBoundStore<
    ReadonlyStore<AttachmentRuntime & { type: "thread-composer" }>
  >;
};
type EditComposerAttachmentContextValue = {
  source: "edit-composer";
  useAttachment: UseBoundStore<
    ReadonlyStore<AttachmentState & { source: "edit-composer" }>
  >;
  useAttachmentRuntime: UseBoundStore<
    ReadonlyStore<AttachmentRuntime & { type: "edit-composer" }>
  >;
};

type MessageAttachmentContextValue = {
  source: "message";
  useAttachment: UseBoundStore<
    ReadonlyStore<AttachmentState & { source: "message" }>
  >;
  useAttachmentRuntime: UseBoundStore<
    ReadonlyStore<AttachmentRuntime & { type: "message" }>
  >;
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

function useThreadComposerAttachmentContext(options?: {
  optional?: false | undefined;
}): ThreadComposerAttachmentContextValue;
function useThreadComposerAttachmentContext(options?: {
  optional?: boolean | undefined;
}): ThreadComposerAttachmentContextValue | null;
function useThreadComposerAttachmentContext(options?: {
  optional?: boolean | undefined;
}): ThreadComposerAttachmentContextValue | null {
  const context = useAttachmentContext(options);
  if (!context) return null;
  if (context.source !== "thread-composer")
    throw new Error(
      "This component must be used within a thread's ComposerPrimitive.Attachments component.",
    );
  return context as ThreadComposerAttachmentContextValue;
}

function useEditComposerAttachmentContext(options?: {
  optional?: false | undefined;
}): EditComposerAttachmentContextValue;
function useEditComposerAttachmentContext(options?: {
  optional?: boolean | undefined;
}): EditComposerAttachmentContextValue | null;
function useEditComposerAttachmentContext(options?: {
  optional?: boolean | undefined;
}): EditComposerAttachmentContextValue | null {
  const context = useAttachmentContext(options);
  if (!context) return null;
  if (context.source !== "edit-composer")
    throw new Error(
      "This component must be used within a messages's ComposerPrimitive.Attachments component.",
    );
  return context as EditComposerAttachmentContextValue;
}

function useMessageAttachmentContext(options?: {
  optional?: false | undefined;
}): MessageAttachmentContextValue;
function useMessageAttachmentContext(options?: {
  optional?: boolean | undefined;
}): MessageAttachmentContextValue | null;
function useMessageAttachmentContext(options?: {
  optional?: boolean | undefined;
}): MessageAttachmentContextValue | null {
  const context = useAttachmentContext(options);
  if (!context) return null;
  if (context.source !== "message")
    throw new Error(
      "This component must be used within a MessagePrimitive.Attachments component.",
    );
  return context as MessageAttachmentContextValue;
}

export function useAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime;
export function useAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null;
export function useAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null {
  const attachmentRuntime = useAttachmentContext(options);
  if (!attachmentRuntime) return null;
  return attachmentRuntime.useAttachmentRuntime();
}

export function useThreadComposerAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime;
export function useThreadComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null;
export function useThreadComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null {
  const attachmentRuntime = useThreadComposerAttachmentContext(options);
  if (!attachmentRuntime) return null;
  return attachmentRuntime.useAttachmentRuntime();
}

export function useEditComposerAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime;
export function useEditComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null;
export function useEditComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null {
  const attachmentRuntime = useEditComposerAttachmentContext(options);
  if (!attachmentRuntime) return null;
  return attachmentRuntime.useAttachmentRuntime();
}

export function useMessageAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime;
export function useMessageAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null;
export function useMessageAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null {
  const attachmentRuntime = useMessageAttachmentContext(options);
  if (!attachmentRuntime) return null;
  return attachmentRuntime.useAttachmentRuntime();
}

export const { useAttachment } = createContextStoreHook(
  useAttachmentContext,
  "useAttachment",
);

export const { useAttachment: useThreadComposerAttachment } =
  createContextStoreHook(useThreadComposerAttachmentContext, "useAttachment");

export const { useAttachment: useEditComposerAttachment } =
  createContextStoreHook(useEditComposerAttachmentContext, "useAttachment");

export const { useAttachment: useMessageAttachment } = createContextStoreHook(
  useMessageAttachmentContext,
  "useAttachment",
);
