import { create } from "zustand";
import { type BaseComposerState, makeBaseComposer } from "./BaseComposer";
import { ReadonlyStore } from "../ReadonlyStore";
import { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadContextValue } from "../react";

export type ComposerState = BaseComposerState &
  Readonly<{
    canCancel: boolean;
    isEditing: true;

    send: () => void;
    cancel: () => void;
    focus: () => void;
    onFocus: (listener: () => void) => Unsubscribe;
  }>;

export const makeComposerStore = (
  useThread: ThreadContextValue["useThread"],
  useThreadMessages: ThreadContextValue["useThreadMessages"],
  useThreadActions: ThreadContextValue["useThreadActions"],
): ReadonlyStore<ComposerState> => {
  const focusListeners = new Set<() => void>();
  return create<ComposerState>()((set, get, store) => {
    return {
      ...makeBaseComposer(set, get, store),

      get canCancel() {
        return useThreadActions.getState().capabilities.cancel;
      },
      isEditing: true,

      send: () => {
        const { setValue, value } = get();
        setValue("");

        useThreadActions.getState().append({
          parentId: useThreadMessages.getState().at(-1)?.id ?? null,
          role: "user",
          content: [{ type: "text", text: value }],
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
    };
  });
};
