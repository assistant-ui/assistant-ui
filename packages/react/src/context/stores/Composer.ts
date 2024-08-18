import { create } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadContextValue } from "../react";
import { ThreadRuntime } from "../../runtimes";

export type ComposerState = Readonly<{
  /** @deprecated Use `text` instead. */
  value: string;
  /** @deprecated Use `setText` instead. */
  setValue: (value: string) => void;

  text: string;
  setText: (value: string) => void;

  canCancel: boolean;
  isEditing: true;

  send: () => void;
  cancel: () => void;
  focus: () => void;
  onFocus: (listener: () => void) => Unsubscribe;
}>;

export const makeComposerStore = (
  useThreadMessages: ThreadContextValue["useThreadMessages"],
  useThreadActions: ThreadContextValue["useThreadActions"],
  canCancel: boolean,
  composerState: ThreadRuntime.Composer,
): ReadonlyStore<ComposerState> => {
  const focusListeners = new Set<() => void>();
  return create<ComposerState>()((_, get) => ({
    get value() {
      return get().text;
    },
    setValue(value) {
      get().setText(value);
    },

    text: composerState.text,
    setText: (value) => {
      composerState.setText(value);
    },

    canCancel,
    isEditing: true,

    send: () => {
      const text = composerState.text;
      composerState.setText("");

      useThreadActions.getState().append({
        parentId: useThreadMessages.getState().at(-1)?.id ?? null,
        role: "user",
        content: [{ type: "text", text }],
      });
    },
    cancel: () => {
      useThreadActions.getState().cancelRun();
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
  }));
};
