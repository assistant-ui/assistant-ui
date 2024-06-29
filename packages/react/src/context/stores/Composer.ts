import { create } from "zustand";
import { type BaseComposerState, makeBaseComposer } from "./BaseComposer";
import { ReadonlyStore } from "../ReadonlyStore";
import { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadContextValue } from "../react";

export type ComposerState = BaseComposerState &
  Readonly<{
    isEditing: true;

    send: () => void;
    cancel: () => boolean;
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
        const thread = useThread.getState();
        if (!thread.isRunning) return false;

        useThreadActions.getState().cancelRun();
        return true;
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
