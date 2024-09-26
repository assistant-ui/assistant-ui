import { create } from "zustand";
import { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadComposerAttachment } from "./Attachment";
import { ThreadComposerRuntime } from "../../api";

export type ThreadComposerState = Readonly<{
  type: "thread";

  /** @deprecated Use `text` instead. This will be removed in 0.6.0. */
  value: string;
  /** @deprecated Use `useComposerRuntime().setText` instead. This will be removed in 0.6.0. */
  setValue: (value: string) => void;

  attachmentAccept: string;

  attachments: readonly ThreadComposerAttachment[];

  /** @deprecated Use `useComposerRuntime().addAttachment` instead. This will be removed in 0.6.0. */
  addAttachment: (file: File) => void;
  /** @deprecated Use `useComposerRuntime().removeAttachment` instead. This will be removed in 0.6.0. */
  removeAttachment: (attachmentId: string) => void;

  text: string;
  /** @deprecated Use `useComposerRuntime().setText` instead. This will be removed in 0.6.0. */
  setText: (value: string) => void;

  /** @deprecated Use `useComposerRuntime().reset` instead. This will be removed in 0.6.0. */
  reset: () => void;

  canCancel: boolean;
  isEditing: true;
  isEmpty: boolean;

  /** @deprecated Use `useComposerRuntime().send` instead. This will be removed in 0.6.0. */
  send: () => void;
  /** @deprecated Use `useComposerRuntime().cancel` instead. This will be removed in 0.6.0. */
  cancel: () => void;

  // TODO replace with events
  focus: () => void;
  onFocus: (listener: () => void) => Unsubscribe;
}>;

export const makeThreadComposerStore = (runtime: ThreadComposerRuntime) => {
  const focusListeners = new Set<() => void>();
  return create<ThreadComposerState>()((_, get) => {
    return {
      type: "thread",

      get value() {
        return get().text;
      },
      setValue(value) {
        get().setText(value);
      },

      ...runtime.getState(),

      canCancel: false, // "TODO",
      isEditing: true,

      addAttachment: (file) => {
        runtime.addAttachment(file);
      },
      removeAttachment: (attachmentId) => {
        runtime.removeAttachment(attachmentId);
      },
      reset: () => {
        runtime.reset();
      },

      setText: (text) => {
        runtime.setText(text);
      },

      send: () => {
        runtime.send();
      },
      cancel: () => {
        runtime.cancel(); // TODO
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
