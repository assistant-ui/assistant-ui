import { create } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadContextValue } from "../react";
import { Attachment } from "./Attachment";

export type ComposerState = Readonly<{
  /** @deprecated Use `text` instead. */
  value: string;
  /** @deprecated Use `setText` instead. */
  setValue: (value: string) => void;

  attachments: readonly Attachment[];
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (attachmentId: string) => void;

  text: string;
  setText: (value: string) => void;

  reset: () => void;

  canCancel: boolean;
  isEditing: true;

  send: () => void;
  cancel: () => void;
  focus: () => void;
  onFocus: (listener: () => void) => Unsubscribe;
}>;

export const makeComposerStore = (
  useThreadRuntime: ThreadContextValue["useThreadRuntime"],
): ReadonlyStore<ComposerState> => {
  const focusListeners = new Set<() => void>();
  return create<ComposerState>()((_, get) => {
    const runtime = useThreadRuntime.getState();
    return {
      get value() {
        return get().text;
      },
      setValue(value) {
        get().setText(value);
      },

      attachments: runtime.composer.attachments,
      addAttachment: (attachment) => {
        useThreadRuntime.getState().composer.addAttachment(attachment);
      },
      removeAttachment: (attachmentId) => {
        useThreadRuntime.getState().composer.removeAttachment(attachmentId);
      },
      reset: () => {
        useThreadRuntime.getState().composer.reset();
      },

      text: runtime.composer.text,
      setText: (text) => {
        useThreadRuntime.getState().composer.setText(text);
      },

      canCancel: runtime.capabilities.cancel,
      isEditing: true,

      send: () => {
        const runtime = useThreadRuntime.getState();
        const text = runtime.composer.text;
        const attachments = runtime.composer.attachments;
        runtime.composer.reset();

        runtime.append({
          parentId: runtime.messages.at(-1)?.id ?? null,
          role: "user",
          content: text ? [{ type: "text", text }] : [],
          attachments,
        });
      },
      cancel: () => {
        useThreadRuntime.getState().cancelRun();
      },
      focus: () => {
        for (const listener of focusListeners) {
          listener();
        }
      },
      onFocus: (listener) => {
        focusListeners.add(listener);
        return () => {
          focusListeners.delete(listener);
        };
      },
    };
  });
};
