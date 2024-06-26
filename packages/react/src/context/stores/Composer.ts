import { create } from "zustand";
import { type BaseComposerState, makeBaseComposer } from "./BaseComposer";
import type { ThreadState } from "./Thread";
import { ThreadActionsState } from "./ThreadActions";
import { ReadonlyStore } from "../ReadonlyStore";

export type ComposerState = BaseComposerState &
  Readonly<{
    isEditing: true;

    send: () => void;
    cancel: () => boolean;
  }>;

export const makeComposerStore = (
  useThread: ReadonlyStore<ThreadState>,
  useThreadActions: ReadonlyStore<ThreadActionsState>,
): ReadonlyStore<ComposerState> =>
  create<ComposerState>()((set, get, store) => {
    return {
      ...makeBaseComposer(set, get, store),

      isEditing: true,

      send: () => {
        const { setValue, value } = get();
        setValue("");

        useThreadActions.getState().append({
          parentId: useThread.getState().messages.at(-1)?.id ?? null,
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
    };
  });
