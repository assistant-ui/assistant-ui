import { create } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadContextValue } from "../react";

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

      text: runtime.composer.text,
      setText: (value) => {
        useThreadRuntime.getState().composer.setText(value);
      },

      canCancel: runtime.capabilities.cancel,
      isEditing: true,

      send: () => {
        const runtime = useThreadRuntime.getState();
        const text = runtime.composer.text;
        runtime.composer.setText("");

        runtime.append({
          parentId: runtime.messages.at(-1)?.id ?? null,
          role: "user",
          content: [{ type: "text", text }],
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
