"use client";

import { AttachmentRuntime } from "../runtime/AttachmentRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { useAui, useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAui()` with `aui.attachment()` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export function useAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime;
export function useAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null;
export function useAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime | null {
  const aui = useAui();
  const runtime = useAuiState(() =>
    aui.attachment.source
      ? (aui.attachment().__internal_getRuntime?.() ?? null)
      : null,
  );
  if (!runtime && !options?.optional) {
    throw new Error("AttachmentRuntime is not available");
  }
  return runtime;
}

export function useThreadComposerAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime<"thread-composer">;
export function useThreadComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"thread-composer"> | null;
export function useThreadComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"thread-composer"> | null {
  const attachmentRuntime = useAttachmentRuntime(options);
  if (!attachmentRuntime) return null;
  if (attachmentRuntime.source !== "thread-composer")
    throw new Error(
      "This component must be used within a thread's ComposerPrimitive.Attachments component.",
    );
  return attachmentRuntime as AttachmentRuntime<"thread-composer">;
}

export function useEditComposerAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime<"edit-composer">;
export function useEditComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"edit-composer"> | null;
export function useEditComposerAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"edit-composer"> | null {
  const attachmentRuntime = useAttachmentRuntime(options);
  if (!attachmentRuntime) return null;
  if (attachmentRuntime.source !== "edit-composer")
    throw new Error(
      "This component must be used within a message's ComposerPrimitive.Attachments component.",
    );

  return attachmentRuntime as AttachmentRuntime<"edit-composer">;
}

export function useMessageAttachmentRuntime(options?: {
  optional?: false | undefined;
}): AttachmentRuntime<"message">;
export function useMessageAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"message"> | null;
export function useMessageAttachmentRuntime(options?: {
  optional?: boolean | undefined;
}): AttachmentRuntime<"message"> | null {
  const attachmentRuntime = useAttachmentRuntime(options);
  if (!attachmentRuntime) return null;
  if (attachmentRuntime.source !== "message")
    throw new Error(
      "This component must be used within a MessagePrimitive.Attachments component.",
    );
  return attachmentRuntime as AttachmentRuntime<"message">;
}

/**
 * @deprecated Use `useAuiState((s) => s.attachment)` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export const useAttachment = createStateHookForRuntime(useAttachmentRuntime);

export const useThreadComposerAttachment = createStateHookForRuntime(
  useThreadComposerAttachmentRuntime,
);
export const useEditComposerAttachment = createStateHookForRuntime(
  useEditComposerAttachmentRuntime,
);
export const useMessageAttachment = createStateHookForRuntime(
  useMessageAttachmentRuntime,
);
