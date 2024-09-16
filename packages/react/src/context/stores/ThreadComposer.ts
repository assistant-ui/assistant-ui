import { create, UseBoundStore } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadContextValue } from "../react";
import { ThreadComposerAttachment } from "./Attachment";

export type ThreadComposerState = Readonly<{
  type: "thread";

  /** @deprecated Use `text` instead. */
  value: string;
  /** @deprecated Use `setText` instead. */
  setValue: (value: string) => void;

  attachments: readonly ThreadComposerAttachment[];
  addAttachment: (file: File) => void;
  removeAttachment: (attachmentId: string) => void;

  text: string;
  setText: (value: string) => void;

  reset: () => void;

  canCancel: boolean;
  isEditing: true;
  isEmpty: boolean;

  send: () => void;
  cancel: () => void;
  focus: () => void;
  onFocus: (listener: () => void) => Unsubscribe;
}>;

export const makeThreadComposerStore = (
  useThreadRuntime: ThreadContextValue["useThreadRuntime"],
): UseBoundStore<ReadonlyStore<ThreadComposerState>> => {
  const focusListeners = new Set<() => void>();
  return create<ThreadComposerState>()((_, get) => {
    const runtime = useThreadRuntime.getState();
    return {
      type: "thread",

      get value() {
        return get().text;
      },
      setValue(value) {
        get().setText(value);
      },

      attachments: runtime.composer.attachments,
      addAttachment: (file) => {
        useThreadRuntime.getState().composer.addAttachment(file);
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
      isEmpty: runtime.composer.isEmpty,

      send: () => {
        const runtime = useThreadRuntime.getState();
        runtime.composer.send();
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
